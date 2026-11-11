package me.watchy.tv

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var tabs: List<TextView>
    private lateinit var content: FrameLayout
    private lateinit var clock: TextView
    private lateinit var home: HomeView
    private lateinit var guideView: GuideView
    private var current = 0
    private var channels: List<Channel> = emptyList()
    private var guide: Guide? = null
    private var loaded = false
    private var refresh: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        home = HomeView(this, ::play)
        guideView = GuideView(this, ::play)

        fun pill(label: String) = text(label, 17f, R.color.text_dim, bold = true).apply {
            setTextColor(resources.getColorStateList(R.color.pill_text, theme))
            setBackgroundResource(R.drawable.pill_bg)
            setPadding(dp(22), dp(10), dp(22), dp(10))
            isFocusable = true
        }
        val homeTab = pill("Home")
        val signOut = pill("Sign out")
        signOut.setOnClickListener { api.signOut(); toSetup(null) }
        val guideTab = pill("Guide")
        tabs = listOf(homeTab, guideTab)
        tabs.forEachIndexed { i, t ->
            t.setOnClickListener { show(i) }
            t.setOnFocusChangeListener { _, f -> if (f) show(i) }
        }
        clock = text("", 17f, R.color.text_dim)

        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(48), dp(24), dp(48), dp(12))
            addView(Wordmark.view(this@MainActivity, 30f), lp().apply { marginEnd = dp(36) })
            addView(homeTab, lp().apply { marginEnd = dp(6) })
            addView(guideTab)
            addView(View(this@MainActivity), lp(0, 1).apply { weight = 1f })
            addView(clock, lp().apply { marginEnd = dp(20) })
            addView(signOut)
        }
        content = FrameLayout(this)
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(bar, lp(MATCH))
            addView(content, lp(MATCH, 0).apply { weight = 1f })
        })
        show(0)
        homeTab.requestFocus()
        if (savedInstanceState == null) onCreatePostLogin()
    }

    private fun show(i: Int) {
        tabs.forEachIndexed { k, t -> t.isSelected = k == i }
        if (content.childCount > 0 && i == current) return
        current = i
        content.removeAllViews()
        content.addView(if (i == 0) home else guideView, FrameLayout.LayoutParams(MATCH, MATCH))
        render()
    }

    private fun render() {
        if (current == 0) home.bind(if (loaded) Games.build(channels, guide) else null)
        else guideView.bind(if (loaded) channels else null, guide)
    }

    private fun onCreatePostLogin() {
        // Re-check the saved login on every launch: a removed account is signed out,
        // a rotated key is picked up. Offline is fine: keep the key we have.
        lifecycleScope.launch {
            try { api.refresh() } catch (e: AuthException) { toSetup(e.message) } catch (_: Exception) {}
        }
        Updater.check(this)
    }

    override fun onStart() {
        super.onStart()
        refresh = lifecycleScope.launch {
            var n = 0
            while (isActive) {
                clock.text = fmtTime(System.currentTimeMillis())
                if (n % 120 == 0) load()
                n++
                delay(1000)
            }
        }
    }

    override fun onStop() {
        refresh?.cancel()
        super.onStop()
    }

    private suspend fun load() {
        try {
            channels = api.channels()
            guide = runCatching { api.guide() }.getOrNull() ?: guide
            loaded = true
            home.error = null
        } catch (e: AuthException) {
            toSetup(e.message); return
        } catch (e: ApiException) {
            loaded = true
            home.error = e.message
        } catch (e: Exception) {
            loaded = true
            home.error = "Can't reach the stream server. Retrying shortly."
        }
        render()
    }

    private fun play(c: Channel) {
        val list = if (channels.any { it.id == c.id }) channels else listOf(c)
        startActivity(Intent(this, PlayerActivity::class.java).apply {
            putExtra("index", list.indexOfFirst { it.id == c.id })
            putExtra("urls", list.map { it.url }.toTypedArray())
            putExtra("titles", list.map { "${it.game} · ${it.provider}" }.toTypedArray())
        })
    }

    private fun toSetup(error: String?) {
        api.signOut()
        startActivity(Intent(this, SetupActivity::class.java).putExtra("error", error))
        finish()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        // Back from the content returns to the tab bar before leaving the app.
        if (keyCode == KeyEvent.KEYCODE_BACK && tabs.none { it.hasFocus() }) {
            tabs[current].requestFocus(); return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
