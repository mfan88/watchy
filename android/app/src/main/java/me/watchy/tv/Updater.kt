package me.watchy.tv

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.appcompat.app.AlertDialog
import androidx.core.content.FileProvider
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONObject
import java.io.File

/** Checks GitHub Releases for a newer APK and offers to install it. */
object Updater {
    // Android TV keeps the app in memory when you leave it, so "once per launch" isn't
    // enough: check whenever the home screen comes to the foreground, at most every
    // 15 minutes, and after "Later" don't ask again for 6 hours.
    private var busy = false
    private var lastCheck = 0L
    private var snoozedUntil = 0L
    private const val CHECK_EVERY = 15 * 60_000L
    private const val SNOOZE = 6 * 60 * 60_000L

    fun newer(latest: String, current: String): Boolean {
        fun parts(v: String) = v.trimStart('v', 'V').split('.', '-').map { it.toIntOrNull() ?: 0 }
        val a = parts(latest); val b = parts(current)
        for (i in 0 until maxOf(a.size, b.size)) {
            val x = a.getOrElse(i) { 0 }; val y = b.getOrElse(i) { 0 }
            if (x != y) return x > y
        }
        return false
    }

    fun <T> check(activity: T) where T : Activity, T : LifecycleOwner {
        val now = System.currentTimeMillis()
        if (busy || BuildConfig.UPDATE_REPO.isEmpty() || now < snoozedUntil || now - lastCheck < CHECK_EVERY) return
        busy = true
        lastCheck = now
        activity.lifecycleScope.launch {
            try {
                val (tag, url) = runCatching { latest(activity) }.getOrNull() ?: return@launch
                if (!newer(tag, BuildConfig.VERSION_NAME) || activity.isFinishing) return@launch
                AlertDialog.Builder(activity)
                    .setTitle("Update available")
                    .setMessage("Watchy ${tag.trimStart('v')} is available (you have ${BuildConfig.VERSION_NAME}).")
                    .setPositiveButton("Update") { _, _ -> install(activity, url) }
                    .setNegativeButton("Later") { _, _ -> snoozedUntil = System.currentTimeMillis() + SNOOZE }
                    .setOnCancelListener { snoozedUntil = System.currentTimeMillis() + SNOOZE }
                    .show()
            } finally {
                busy = false
            }
        }
    }

    private suspend fun latest(a: Activity): Pair<String, String>? = withContext(Dispatchers.IO) {
        val req = Request.Builder().url("https://api.github.com/repos/${BuildConfig.UPDATE_REPO}/releases/latest")
            .header("Accept", "application/vnd.github+json").build()
        a.api.http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) return@withContext null
            val j = JSONObject(r.body!!.string())
            val assets = j.getJSONArray("assets")
            for (i in 0 until assets.length()) {
                val asset = assets.getJSONObject(i)
                if (asset.getString("name").endsWith(".apk")) return@withContext j.getString("tag_name") to asset.getString("browser_download_url")
            }
            null
        }
    }

    private fun <T> install(a: T, url: String) where T : Activity, T : LifecycleOwner {
        if (Build.VERSION.SDK_INT >= 26 && !a.packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(a)
                .setTitle("Allow updates")
                .setMessage("To update itself, Watchy needs permission to install apps. Turn it on for Watchy on the next screen, then come back and choose Update again.")
                .setPositiveButton("Open settings") { _, _ ->
                    lastCheck = 0L // check again as soon as they're back from settings
                    a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${a.packageName}")))
                }
                .setNegativeButton("Cancel", null)
                .show()
            return
        }
        val progress = AlertDialog.Builder(a).setTitle("Downloading update…").setCancelable(false).show()
        a.lifecycleScope.launch {
            val file = runCatching {
                withContext(Dispatchers.IO) {
                    val f = File(a.cacheDir, "updates/watchy.apk").apply { parentFile?.mkdirs(); delete() }
                    a.api.http.newCall(Request.Builder().url(url).build()).execute().use { r ->
                        if (!r.isSuccessful) error("HTTP ${r.code}")
                        f.outputStream().use { out -> r.body!!.byteStream().copyTo(out) }
                    }
                    f
                }
            }.getOrNull()
            progress.dismiss()
            if (file == null) {
                AlertDialog.Builder(a).setMessage("Couldn't download the update. Try again later.").setPositiveButton("OK", null).show()
                return@launch
            }
            val uri = FileProvider.getUriForFile(a, "${a.packageName}.updates", file)
            a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
