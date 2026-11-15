package me.watchy.tv

import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/** Settings → Playback → Stream format (Auto / fMP4 / MPEG-TS). Saved on this device. */
class SettingsActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val hint = text("", 16f, R.color.text_dim)
        val options = mutableListOf<TextView>()

        fun select(f: StreamFormat) {
            Streams.setSetting(this, f)
            StreamFormat.entries.forEachIndexed { i, e -> options[i].isSelected = e == f }
            hint.text = f.hint
        }

        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        for (f in StreamFormat.entries) {
            val pill = text(f.label, 17f, R.color.text_dim, bold = true).apply {
                setTextColor(resources.getColorStateList(R.color.pill_text, theme))
                setBackgroundResource(R.drawable.pill_bg)
                setPadding(dp(22), dp(10), dp(22), dp(10))
                isFocusable = true
                setOnClickListener { select(f) }
            }
            options += pill
            row.addView(pill, lp().apply { marginEnd = dp(8) })
        }

        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(48), dp(36), dp(48), dp(36))
            addView(text("Settings", 30f, bold = true), lp().apply { bottomMargin = dp(32) })
            addView(text("PLAYBACK", 12f, R.color.text_faint, label = true).apply { letterSpacing = 0.1f }, lp().apply { bottomMargin = dp(14) })
            addView(text("Stream format", 20f, label = true), lp().apply { bottomMargin = dp(12) })
            addView(row)
            addView(hint, lp().apply { topMargin = dp(14) })
        })
        val cur = Streams.setting(this)
        select(cur)
        options[cur.ordinal].requestFocus()
    }
}
