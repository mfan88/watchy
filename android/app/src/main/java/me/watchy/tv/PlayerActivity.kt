package me.watchy.tv

import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Full-screen live player. Up/Down (or CH+/CH−) flips between streams. */
@OptIn(UnstableApi::class)
class PlayerActivity : AppCompatActivity() {
    private lateinit var ids: Array<String>
    private lateinit var titles: Array<String>
    private var index = 0
    private var player: ExoPlayer? = null
    private lateinit var view: PlayerView
    private lateinit var osd: LinearLayout
    private val osdTitle by lazy { text("", 24f, bold = true) }
    private val osdSub by lazy { text("", 15f, R.color.text_dim) }
    private lateinit var spinner: ProgressBar
    private var osdJob: Job? = null

    // Auto-recovery: MediaMTX restarts a channel's HLS muxer when an upstream mirror
    // hiccups (same URL, back within ~1–2 s). Ride through it instead of erroring out.
    private var retryJob: Job? = null
    private var stableJob: Job? = null
    private var authJob: Job? = null
    private var attempt = 0
    private var retryStart = 0L
    private var authTried = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        ids = intent.getStringArrayExtra("urls") ?: emptyArray()
        titles = intent.getStringArrayExtra("titles") ?: emptyArray()
        index = intent.getIntExtra("index", 0).coerceIn(0, (ids.size - 1).coerceAtLeast(0))
        if (ids.isEmpty()) { finish(); return }

        view = PlayerView(this).apply {
            useController = true
            controllerShowTimeoutMs = 3000
            // Don't pop the controls up on their own while a stream loads or buffers:
            // they'd capture Up/Down. OK still shows them.
            controllerAutoShow = false
            setShowFastForwardButton(false); setShowRewindButton(false)
            setShowNextButton(false); setShowPreviousButton(false)
            setBackgroundColor(color(android.R.color.black))
            keepScreenOn = true
        }
        spinner = ProgressBar(this)
        osd = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.osd_bg)
            setPadding(dp(24), dp(18), dp(28), dp(18))
            addView(text("LIVE", 11f, label = true).apply { setBackgroundResource(R.drawable.badge_live); setPadding(dp(7), dp(3), dp(7), dp(3)) }, lp().apply { bottomMargin = dp(10) })
            addView(osdTitle)
            addView(osdSub, lp().apply { topMargin = dp(6) })
        }
        setContentView(FrameLayout(this).apply {
            addView(view, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(spinner, FrameLayout.LayoutParams(dp(56), dp(56), Gravity.CENTER))
            addView(osd, FrameLayout.LayoutParams(WRAP, WRAP, Gravity.TOP or Gravity.START).apply { setMargins(dp(48), dp(36), 0, 0) })
        })
    }

    override fun onStart() {
        super.onStart()
        val p = ExoPlayer.Builder(this)
            .setMediaSourceFactory(HlsMediaSource.Factory(OkHttpDataSource.Factory(api.http))
                // Retry single playlist/segment failures (muxer restart) before they turn fatal.
                .setLoadErrorHandlingPolicy(DefaultLoadErrorHandlingPolicy(MIN_LOADABLE_RETRIES)))
            .build()
        p.playWhenReady = true
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                // Keep the spinner up while an auto-retry is pending.
                spinner.visibility = if (state == Player.STATE_BUFFERING || retryJob?.isActive == true) View.VISIBLE else View.GONE
                if (state == Player.STATE_READY) armStableReset() else stableJob?.cancel()
                // A live stream never ends on its own: treat it as a dropped source.
                if (state == Player.STATE_ENDED) handleError(p, PlaybackException("live source ended", null, PlaybackException.ERROR_CODE_IO_UNSPECIFIED))
            }
            override fun onPlayerError(error: PlaybackException) = handleError(p, error)
        })
        view.player = p
        player = p
        tune()
    }

    private fun handleError(p: ExoPlayer, error: PlaybackException) {
        stableJob?.cancel()
        val code = httpCode(error)
        val playlist = isPlaylistRequest(error)
        // Credentials: one re-auth per stable session, then surface it (no refresh loop).
        if (code == 401 || code == 403) { if (authTried) showFailure(error) else reauth(); return }
        if (!isTransient(error)) { showFailure(error); return }
        val now = SystemClock.elapsedRealtime()
        if (attempt == 0) retryStart = now
        if (now - retryStart > RETRY_WINDOW_MS) {
            // Persistent playlist 404: the key may have rotated. Otherwise a real outage.
            if (code == 404 && playlist && !authTried) reauth() else showFailure(error)
            return
        }
        val wait = BACKOFF_MS.getOrElse(attempt) { BACKOFF_MS.last() }
        attempt++
        Log.d(TAG, "auto-retry #$attempt in ${wait}ms: ${error.errorCodeName}${code?.let { " http $it" } ?: ""}")
        spinner.visibility = View.VISIBLE
        retryJob?.cancel()
        retryJob = lifecycleScope.launch {
            if (wait > 0) delay(wait)
            if (player !== p) return@launch
            if (error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {
                p.seekToDefaultPosition(); p.prepare()
            } else {
                // Re-prepare the same item and jump to the live edge. The last frame stays
                // on screen (PlayerView keeps it while the new session buffers).
                p.seekToDefaultPosition(); p.prepare(); p.play()
            }
        }
    }

    private fun armStableReset() {
        stableJob?.cancel()
        stableJob = lifecycleScope.launch {
            delay(STABLE_MS)
            attempt = 0; authTried = false
        }
    }

    private fun resetRetries() {
        retryJob?.cancel(); stableJob?.cancel(); authJob?.cancel()
        attempt = 0; authTried = false
    }

    private fun showFailure(error: PlaybackException) {
        retryJob?.cancel()
        spinner.visibility = View.GONE
        showOsd("Stream unavailable", "${error.errorCodeName.removePrefix("ERROR_CODE_").lowercase().replace('_', ' ')} · press OK to retry", sticky = true)
    }

    /** 401/403 (or a playlist 404 that outlasted the retry window): the existing /auth/key path. */
    private fun reauth() {
        if (authJob?.isActive == true) return
        authTried = true
        retryJob?.cancel()
        spinner.visibility = View.VISIBLE
        val old = api.secret
        authJob = lifecycleScope.launch {
            try {
                api.refresh()
            } catch (e: AuthException) {
                api.signOut()
                startActivity(Intent(this@PlayerActivity, SetupActivity::class.java)
                    .putExtra("error", e.message)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                finish(); return@launch
            } catch (_: Exception) { /* offline: keep the key and retry below */ }
            val now = api.secret
            if (old.isNotEmpty() && now.isNotEmpty() && now != old) ids = Array(ids.size) { ids[it].replace("/$old/", "/$now/") }
            attempt = 0
            tune(keepRetryState = true)
        }
    }

    override fun onStop() {
        resetRetries()
        view.player = null
        player?.release()
        player = null
        super.onStop()
    }

    private fun tune(keepRetryState: Boolean = false) {
        if (!keepRetryState) resetRetries() else retryJob?.cancel()
        val url = ids[index]
        val (game, provider) = titles.getOrElse(index) { "" }.split(" · ", limit = 2).let { it[0] to it.getOrElse(1) { "" } }
        showOsd(game, if (ids.size > 1) "$provider  ·  ${index + 1}/${ids.size}  ·  ▲▼ change stream" else provider)
        spinner.visibility = View.VISIBLE
        player?.run {
            setMediaItem(MediaItem.Builder().setUri(url).setMimeType(MimeTypes.APPLICATION_M3U8)
                .setLiveConfiguration(MediaItem.LiveConfiguration.Builder().setTargetOffsetMs(12_000).build()).build())
            prepare()
        }
    }

    private fun showOsd(title: String, sub: String, sticky: Boolean = false) {
        osdTitle.text = title
        osdSub.text = sub
        osd.animate().cancel()
        osd.alpha = 1f
        osd.visibility = View.VISIBLE
        osdJob?.cancel()
        if (!sticky) osdJob = lifecycleScope.launch {
            delay(4000)
            osd.animate().alpha(0f).setDuration(300).withEndAction { osd.visibility = View.GONE }.start()
        }
    }

    private fun step(d: Int) {
        if (ids.size < 2) return
        index = (index + d + ids.size) % ids.size
        tune()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            val controls = view.isControllerFullyVisible
            when (event.keyCode) {
                KeyEvent.KEYCODE_CHANNEL_UP -> { step(-1); return true }
                KeyEvent.KEYCODE_CHANNEL_DOWN -> { step(1); return true }
                // Up/Down always change stream (remotes like the Mi Box's have no CH+/CH-),
                // even while loading or with the controls showing.
                KeyEvent.KEYCODE_DPAD_UP -> { view.hideController(); step(-1); return true }
                KeyEvent.KEYCODE_DPAD_DOWN -> { view.hideController(); step(1); return true }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    val p = player
                    if (p != null && p.playerError != null && retryJob?.isActive != true) { tune(); return true }
                    if (!controls) { showOsd(osdTitle.text.toString(), osdSub.text.toString()); view.showController(); return true }
                }
                KeyEvent.KEYCODE_BACK -> if (controls) { view.hideController(); return true }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    companion object {
        private const val TAG = "WatchyPlayer"
        private const val MIN_LOADABLE_RETRIES = 6
        private val BACKOFF_MS = longArrayOf(0, 1_000, 2_000, 4_000, 5_000)
        private const val RETRY_WINDOW_MS = 60_000L
        private const val STABLE_MS = 10_000L

        fun httpCode(e: PlaybackException): Int? =
            generateSequence<Throwable>(e) { it.cause }.filterIsInstance<HttpDataSource.InvalidResponseCodeException>().firstOrNull()?.responseCode

        fun isPlaylistRequest(e: PlaybackException): Boolean =
            generateSequence<Throwable>(e) { it.cause }.filterIsInstance<HttpDataSource.HttpDataSourceException>()
                .firstOrNull()?.dataSpec?.uri?.lastPathSegment?.endsWith(".m3u8") == true

        /** IO / network / HTTP, BehindLiveWindow, parser errors, or the source ending early. */
        fun isTransient(e: PlaybackException): Boolean = when (e.errorCode) {
            PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW,
            PlaybackException.ERROR_CODE_TIMEOUT,
            PlaybackException.ERROR_CODE_UNSPECIFIED,
            PlaybackException.ERROR_CODE_REMOTE_ERROR -> true
            in 2000..2999 -> true // IO_* (network, HTTP status, file not found, read position…)
            in 3000..3999 -> true // PARSING_* (half-written playlist/segment during restart)
            else -> false
        }
    }
}
