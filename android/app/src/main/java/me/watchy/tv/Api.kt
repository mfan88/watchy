package me.watchy.tv

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AuthException : Exception("unauthorized")
class ApiException(msg: String) : Exception(msg)

/** Persists the server's session cookie so sign-in survives restarts (same 7-day JWT as the web app). */
private class PrefsCookieJar(private val prefs: SharedPreferences) : CookieJar {
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        for (c in cookies) if (c.name == COOKIE) {
            if (c.expiresAt < System.currentTimeMillis() || c.value.isEmpty()) prefs.edit().remove(KEY).apply()
            else prefs.edit().putString(KEY, c.value).putString(KEY_HOST, url.host).apply()
        }
    }
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val v = prefs.getString(KEY, null) ?: return emptyList()
        if (prefs.getString(KEY_HOST, null) != url.host) return emptyList()
        return listOf(Cookie.Builder().name(COOKIE).value(v).hostOnlyDomain(url.host).path("/").build())
    }
    fun clear() = prefs.edit().remove(KEY).apply()
    fun has() = prefs.contains(KEY)
    companion object {
        const val COOKIE = "watchy_session"
        const val KEY = "session"
        const val KEY_HOST = "session_host"
    }
}

class Api(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("watchy", Context.MODE_PRIVATE)
    private val jar = PrefsCookieJar(prefs)
    val http: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(jar)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    var server: String
        get() = prefs.getString("server", null) ?: BuildConfig.DEFAULT_SERVER
        set(v) = prefs.edit().putString("server", v.trim().trimEnd('/')).apply()

    var username: String
        get() = prefs.getString("username", "") ?: ""
        set(v) = prefs.edit().putString("username", v).apply()

    val signedIn get() = jar.has() && server.isNotEmpty()

    fun url(path: String) = server.trimEnd('/') + path

    private suspend fun get(path: String): JSONObject = withContext(Dispatchers.IO) {
        http.newCall(Request.Builder().url(url(path)).header("Accept", "application/json").build()).execute().use { r ->
            if (r.code == 401) { jar.clear(); throw AuthException() }
            val body = r.body?.string().orEmpty()
            val json = runCatching { JSONObject(body) }.getOrNull()
            if (!r.isSuccessful && json == null) throw ApiException("Server error ${r.code}")
            json ?: throw ApiException("Unexpected response")
        }
    }

    suspend fun login(user: String, pass: String) = withContext(Dispatchers.IO) {
        val body = JSONObject().put("username", user).put("password", pass).toString()
            .toRequestBody("application/json".toMediaType())
        val req = try {
            Request.Builder().url(url("/api/login")).post(body).build()
        } catch (e: IllegalArgumentException) {
            throw ApiException("Invalid server address")
        }
        http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) {
                val msg = runCatching { JSONObject(r.body!!.string()).getString("error") }.getOrNull()
                throw ApiException(msg ?: "Sign-in failed (${r.code})")
            }
            if (!jar.has()) throw ApiException("Server did not start a session")
        }
    }

    suspend fun logout() {
        withContext(Dispatchers.IO) {
            runCatching {
                http.newCall(Request.Builder().url(url("/api/logout")).post(ByteArray(0).toRequestBody()).build()).execute().close()
            }
        }
        jar.clear()
    }

    suspend fun channels(): List<Channel> {
        val arr = get("/api/channels").optJSONArray("channels") ?: return emptyList()
        return (0 until arr.length()).map { Channel.from(arr.getJSONObject(it)) }
    }

    suspend fun guide(): Guide {
        val j = get("/api/guide")
        val arr = j.optJSONArray("programmes")
        val list = if (arr == null) emptyList() else (0 until arr.length()).map { Programme.from(arr.getJSONObject(it)) }
        return Guide(j.optLong("now", System.currentTimeMillis()), list)
    }

    suspend fun streamUrl(channelId: String): String {
        val j = get("/api/stream?id=" + java.net.URLEncoder.encode(channelId, "UTF-8"))
        return j.optString("url").ifEmpty { throw ApiException(j.optString("error", "Stream unavailable")) }
    }
}
