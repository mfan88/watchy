package me.watchy.tv

import android.content.Context
import android.util.Xml
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.xmlpull.v1.XmlPullParser
import java.util.Calendar
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class ApiException(msg: String) : Exception(msg)
class AuthException(msg: String) : Exception(msg)

/**
 * Signs in at the stream server's /auth/key endpoint (username + password -> stream
 * base URL + key), then reads the playlist and guide straight from the stream server.
 */
class Api(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("watchy", Context.MODE_PRIVATE)
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val base: String get() = (prefs.getString("base", null) ?: "").trimEnd('/')
    val secret: String get() = prefs.getString("secret", "") ?: ""
    val username: String get() = prefs.getString("username", "") ?: ""
    val signedIn get() = secret.isNotEmpty() && base.isNotEmpty() && prefs.contains("password")

    fun signOut() = prefs.edit().remove("password").remove("secret").apply()

    /** Exchanges credentials for the stream key. Throws AuthException on 401. */
    suspend fun login(user: String, pass: String) = withContext(Dispatchers.IO) {
        val body = org.json.JSONObject().put("username", user).put("password", pass).toString()
            .toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url(BuildConfig.AUTH_URL).post(body).build()
        val r = try { http.newCall(req).execute() } catch (e: java.io.IOException) { throw ApiException("Can't reach the Watchy server") }
        r.use {
            val json = runCatching { org.json.JSONObject(it.body?.string().orEmpty()) }.getOrNull()
            when {
                it.code == 401 -> throw AuthException(json?.optString("error")?.ifEmpty { null } ?: "Invalid username or password.")
                !it.isSuccessful -> throw ApiException(json?.optString("error")?.ifEmpty { null } ?: "Sign-in failed (${it.code})")
            }
            val sec = json?.optString("secret").orEmpty().trim('/')
            val b = json?.optString("base").orEmpty().ifEmpty { BuildConfig.AUTH_URL.substringBefore("/auth/") }
            if (sec.isEmpty()) throw ApiException("Server did not return a key")
            prefs.edit().putString("username", user).putString("password", pass)
                .putString("secret", sec).putString("base", b.trimEnd('/')).apply()
        }
    }

    /** Re-checks the saved login. AuthException means the account was removed or changed. */
    suspend fun refresh() {
        val pass = prefs.getString("password", null) ?: throw AuthException("Signed out")
        login(username, pass)
    }

    private suspend fun fetch(file: String): String = withContext(Dispatchers.IO) {
        val req = try { Request.Builder().url("$base/$secret/$file").build() }
                  catch (e: IllegalArgumentException) { throw ApiException("Access key not accepted") }
        http.newCall(req).execute().use { r ->
            if (r.code == 401 || r.code == 403 || r.code == 404) throw ApiException("Access key not accepted (${r.code})")
            if (!r.isSuccessful) throw ApiException("Stream server error ${r.code}")
            r.body?.string().orEmpty()
        }
    }

    suspend fun channels(): List<Channel> = try {
        parseM3U(fetch("playlist.m3u"))
    } catch (e: ApiException) {
        // Key rotated on the server: sign in again with the saved login and retry once.
        if (!e.message.orEmpty().startsWith("Access key")) throw e
        refresh()
        parseM3U(fetch("playlist.m3u"))
    }

    suspend fun guide(): Guide = withContext(Dispatchers.Default) {
        val xml = fetch("guide.xml")
        Guide(System.currentTimeMillis(), parseXmltv(xml))
    }

    companion object {
        private const val SEP = " · "

        fun parseM3U(text: String): List<Channel> {
            val out = mutableListOf<Channel>()
            val lines = text.lines()
            val attrRe = Regex("([\\w-]+)=\"([^\"]*)\"")
            for (i in lines.indices) {
                val line = lines[i].trim()
                if (!line.startsWith("#EXTINF:")) continue
                val attrs = attrRe.findAll(line).associate { it.groupValues[1] to it.groupValues[2] }
                val title = line.replace(Regex("\"[^\"]*\""), "\"\"").split(",").drop(1).joinToString(",").trim()
                var url = ""
                for (j in i + 1 until lines.size) {
                    val l = lines[j].trim()
                    if (l.isEmpty()) continue
                    if (!l.startsWith("#")) url = l
                    break
                }
                val id = attrs["tvg-id"]
                if (url.isEmpty() || id.isNullOrEmpty()) continue
                val name = attrs["tvg-name"].orEmpty().ifEmpty { title.ifEmpty { id } }
                val k = name.indexOf(SEP)
                val game = if (k == -1) name else name.substring(0, k)
                val provider = if (k == -1) "Main feed" else name.substring(k + SEP.length)
                val teams = Regex("^(\\S+)\\s+@\\s+(\\S+)$").find(game)
                out += Channel(id, attrs["tvg-chno"]?.toIntOrNull() ?: (out.size + 1), name, game, provider,
                    teams?.groupValues?.get(1), teams?.groupValues?.get(2), url)
            }
            return out
        }

        // "20261022130000 +0000" -> epoch ms
        fun parseTime(v: String): Long? {
            val m = Regex("^(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{2})?\\s*([+-]\\d{4})?$").find(v.trim()) ?: return null
            val g = m.groupValues
            val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                clear()
                set(g[1].toInt(), g[2].toInt() - 1, g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].ifEmpty { "0" }.toInt())
            }
            val tz = g[7].ifEmpty { "+0000" }
            val off = (if (tz[0] == '-') -1 else 1) * (tz.substring(1, 3).toInt() * 60 + tz.substring(3, 5).toInt())
            return cal.timeInMillis - off * 60_000L
        }

        fun parseXmltv(xml: String): List<Programme> {
            val out = mutableListOf<Programme>()
            val p = Xml.newPullParser()
            p.setInput(xml.reader())
            var c: String? = null; var s: Long? = null; var e: Long? = null
            var t: String? = null; var d: String? = null; var field: String? = null
            while (true) {
                when (p.next()) {
                    XmlPullParser.END_DOCUMENT -> break
                    XmlPullParser.START_TAG -> when (p.name) {
                        "programme" -> {
                            c = p.getAttributeValue(null, "channel")
                            s = p.getAttributeValue(null, "start")?.let(::parseTime)
                            e = p.getAttributeValue(null, "stop")?.let(::parseTime)
                            t = null; d = null
                        }
                        "title", "desc" -> field = p.name
                    }
                    XmlPullParser.TEXT -> when (field) {
                        "title" -> t = (t.orEmpty() + p.text)
                        "desc" -> d = (d.orEmpty() + p.text)
                    }
                    XmlPullParser.END_TAG -> when (p.name) {
                        "title", "desc" -> field = null
                        "programme" -> {
                            var title = t?.replace(Regex("\\s+"), " ")?.trim()
                            if (c != null && s != null && e != null && !title.isNullOrEmpty()) {
                                val soon = Regex("\\(starting soon\\)\\s*$", RegexOption.IGNORE_CASE).containsMatchIn(title)
                                if (soon) title = title.replace(Regex("\\s*\\(starting soon\\)\\s*$", RegexOption.IGNORE_CASE), "")
                                out += Programme(c, s, e, title, d?.replace(Regex("\\s+"), " ")?.trim()?.ifEmpty { null }, soon)
                            }
                        }
                    }
                }
            }
            return out
        }
    }
}
