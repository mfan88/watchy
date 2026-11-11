package me.watchy.tv

import android.content.Context
import android.graphics.Typeface
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import coil.load
import java.text.DateFormat
import java.util.Date

fun Context.dp(v: Number) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()
fun Context.color(id: Int) = ContextCompat.getColor(this, id)

fun Context.text(s: CharSequence, sizeSp: Float = 16f, colorRes: Int = R.color.text, bold: Boolean = false) = TextView(this).apply {
    text = s
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
    setTextColor(color(colorRes))
    if (bold) typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    includeFontPadding = false
}

fun lp(w: Int = ViewGroup.LayoutParams.WRAP_CONTENT, h: Int = ViewGroup.LayoutParams.WRAP_CONTENT) = LinearLayout.LayoutParams(w, h)
const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT

fun Context.badge(live: Boolean) = text(if (live) "LIVE" else "SOON", 11f, if (live) R.color.text else R.color.bg, bold = true).apply {
    setBackgroundResource(if (live) R.drawable.badge_live else R.drawable.badge_soon)
    setPadding(dp(7), dp(3), dp(7), dp(3))
    letterSpacing = 0.08f
}

/** Subtle zoom on focus, as Android TV cards do. */
fun View.focusZoom(scale: Float = 1.05f) {
    setOnFocusChangeListener { v, f ->
        v.animate().scaleX(if (f) scale else 1f).scaleY(if (f) scale else 1f).setDuration(140).start()
        v.elevation = if (f) 12f else 0f
    }
}

fun ImageView.loadPath(ctx: Context, path: String?, fallback: (() -> Unit)? = null) {
    if (path == null) { fallback?.invoke(); return }
    load("file:///android_asset" + path) { listener(onError = { _, _ -> fallback?.invoke() }) }
}

/** Initials avatar used when a provider has no logo. */
fun Context.initials(label: String, sizeDp: Int) = text(
    label.split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2).joinToString("") { it.take(1).uppercase() }.ifEmpty { "?" },
    (sizeDp / 2.6f), R.color.text, bold = true,
).apply {
    gravity = android.view.Gravity.CENTER
    setBackgroundResource(R.drawable.badge_avatar)
}

private val timeFmt get() = DateFormat.getTimeInstance(DateFormat.SHORT)
fun fmtTime(ms: Long): String = timeFmt.format(Date(ms))
