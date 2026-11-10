package me.watchy.tv

import android.content.Context
import android.util.Xml
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.xmlpull.v1.XmlPullParser
import java.util.Calendar
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class ApiException(msg: String) : Exception(msg)

/**
 * Talks straight to the stream server (HTV_BASE_URL/HTV_SECRET/...), the same
 * source the website's server reads. The secret is baked in at build time or
 * entered once on first launch.
 */
class Api(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("watchy", Context.MODE_PRIVATE)
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val base: String get() = BuildConfig.HTV_BASE_URL.trimEnd('/')

    var secret: String
        get() = BuildConfig.HTV_SECRET.ifEmpty { prefs.getString("secret", "") ?: "" }
        set(v) = prefs.edit().putString("secret", v.trim().trim('/')).apply()

    val configured get() = secret.isNotEmpty()
    val secretBundled get() = BuildConfig.HTV_SECRET.isNotEmpty()
    fun forgetSecret() = prefs.edit().remove("secret").apply()

    private suspend fun fetch(file: String): String = withContext(Dispatchers.IO) {
        val req = try { Request.Builder().url("$base/$secret/$file").build() }
                  catch (e: IllegalArgumentException) { throw ApiException("Invalid access key") }
        http.newCall(req).execute().use { r ->
            if (r.code == 401 || r.code == 403 || r.code == 404) throw ApiException("Access key not accepted (${r.code})")
            if (!r.isSuccessful) throw ApiException("Stream server error ${r.code}")
            r.body?.string().orEmpty()
        }
    }

    suspend fun channels(): List<Channel> = parseM3U(fetch("playlist.m3u"))

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
