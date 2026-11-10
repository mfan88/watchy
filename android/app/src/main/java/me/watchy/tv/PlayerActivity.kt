package me.watchy.tv

import android.os.Bundle
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
import androidx.media3.datasource.okhttp.OkHttpDataSource
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
            addView(text("LIVE", 11f, bold = true).apply { setBackgroundResource(R.drawable.badge_live); setPadding(dp(7), dp(3), dp(7), dp(3)) }, lp().apply { bottomMargin = dp(10) })
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
            .setMediaSourceFactory(HlsMediaSource.Factory(OkHttpDataSource.Factory(api.http)))
            .build()
        p.playWhenReady = true
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                spinner.visibility = if (state == Player.STATE_BUFFERING) View.VISIBLE else View.GONE
            }
            override fun onPlayerError(error: PlaybackException) {
                if (error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {
                    p.seekToDefaultPosition(); p.prepare(); return
                }
                showOsd("Stream unavailable", "${error.errorCodeName.removePrefix("ERROR_CODE_").lowercase().replace('_', ' ')} · press OK to retry", sticky = true)
            }
        })
        view.player = p
        player = p
        tune()
    }

    override fun onStop() {
        view.player = null
        player?.release()
        player = null
        super.onStop()
    }

    private fun tune() {
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
                KeyEvent.KEYCODE_DPAD_UP -> if (!controls) { step(-1); return true }
                KeyEvent.KEYCODE_DPAD_DOWN -> if (!controls) { step(1); return true }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                    val p = player
                    if (p != null && p.playerError != null) { tune(); return true }
                    if (!controls) { showOsd(osdTitle.text.toString(), osdSub.text.toString()); view.showController(); return true }
                }
                KeyEvent.KEYCODE_BACK -> if (controls) { view.hideController(); return true }
            }
        }
        return super.dispatchKeyEvent(event)
    }
}
