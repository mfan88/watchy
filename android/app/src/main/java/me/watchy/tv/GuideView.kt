package me.watchy.tv

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

private const val SLOT = 30 * 60_000L
private const val SPAN = 6 * SLOT // 3 hours on screen

/** Lays children out along a time axis; each child's tag is a LongArray(start, end). Draws the "now" line. */
private class TimeRow(ctx: Context, var from: Long, var drawNow: Boolean = true) : ViewGroup(ctx) {
    private val gap = ctx.dp(4)
    private val nowPaint = Paint().apply { color = ctx.color(R.color.accent); strokeWidth = ctx.dp(2).toFloat() }
    init { setWillNotDraw(false); clipChildren = false }

    private fun x(t: Long) = ((t - from).coerceIn(0, SPAN).toDouble() / SPAN * width).toInt()

    override fun onMeasure(w: Int, h: Int) {
        val width = MeasureSpec.getSize(w)
        val height = MeasureSpec.getSize(h)
        for (i in 0 until childCount) {
            val c = getChildAt(i); val t = c.tag as LongArray
            val cw = (((t[1].coerceAtMost(from + SPAN) - t[0].coerceAtLeast(from)).toDouble() / SPAN) * width).toInt() - gap
            c.measure(MeasureSpec.makeMeasureSpec(cw.coerceAtLeast(0), MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
        }
        setMeasuredDimension(width, height)
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        for (i in 0 until childCount) {
            val c = getChildAt(i); val left = x((c.tag as LongArray)[0])
            c.layout(left, 0, left + c.measuredWidth, c.measuredHeight)
        }
    }

    override fun dispatchDraw(canvas: Canvas) {
        super.dispatchDraw(canvas)
        val now = System.currentTimeMillis()
        if (drawNow && now in from..from + SPAN) { val nx = x(now).toFloat(); canvas.drawLine(nx, 0f, nx, height.toFloat(), nowPaint) }
    }
}

/** TV-guide grid: one row per stream, programmes laid out on a shared time axis. */
@SuppressLint("ViewConstructor")
class GuideView(ctx: Context, private val onPlay: (Channel) -> Unit) : LinearLayout(ctx) {
    private val labelW = ctx.dp(300)
    private val rowH = ctx.dp(68)
    private var from = 0L
    private var rows: List<Pair<Channel, List<Programme>>> = emptyList()

    private val dTitle = ctx.text("", 26f, bold = true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }
    private val dMeta = ctx.text("", 16f, R.color.text_dim).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END }
    private val header = TimeRow(ctx, 0, drawNow = false)
    private val status = FrameLayout(ctx)
    private val list = RecyclerView(ctx).apply {
        layoutManager = LinearLayoutManager(ctx)
        itemAnimator = null
        clipToPadding = false
        setPadding(0, 0, 0, ctx.dp(40))
    }

    init {
        orientation = VERTICAL
        setPadding(ctx.dp(48), ctx.dp(4), ctx.dp(48), 0)
        addView(LinearLayout(ctx).apply {
            orientation = VERTICAL
            minimumHeight = ctx.dp(92)
            addView(dTitle)
            addView(dMeta, lp().apply { topMargin = ctx.dp(8) })
        }, lp(MATCH).apply { bottomMargin = ctx.dp(12) })
        addView(LinearLayout(ctx).apply {
            addView(ctx.text("Today", 14f, R.color.text_faint, label = true).apply { letterSpacing = 0.1f }, lp(labelW))
            addView(header, lp(0, ctx.dp(28)).apply { weight = 1f })
        }, lp(MATCH))
        addView(View(ctx).apply { setBackgroundColor(ctx.color(R.color.stroke)) }, lp(MATCH, 1).apply { bottomMargin = ctx.dp(6) })
        addView(FrameLayout(ctx).apply {
            addView(list, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(status, FrameLayout.LayoutParams(MATCH, MATCH))
        }, lp(MATCH, 0).apply { weight = 1f })
        list.adapter = Adapter()
    }

    @SuppressLint("NotifyDataSetChanged")
    fun bind(channels: List<Channel>?, guide: Guide?) {
        val now = System.currentTimeMillis()
        val newFrom = now - now % SLOT
        val byCh = guide?.programmes.orEmpty().groupBy { it.c }
        val newRows = Games.build(channels.orEmpty(), guide).flatMap { g -> g.feeds.map { c ->
            c to byCh[c.id].orEmpty().filter { it.e > newFrom && it.s < newFrom + SPAN }.sortedBy { it.s }.let(::dedupe)
        } }
        if (channels != null && newFrom == from && newRows == rows && header.childCount > 0) { list.invalidate(); return }
        from = newFrom
        header.from = from
        header.removeAllViews()
        for (i in 0 until 6) {
            val s = from + i * SLOT
            header.addView(context.text(fmtTime(s), 14f, R.color.text_dim).apply { tag = longArrayOf(s, s + SLOT); gravity = Gravity.CENTER_VERTICAL })
        }
        status.removeAllViews()
        if (channels == null) {
            status.addView(ProgressBar(context), FrameLayout.LayoutParams(WRAP, WRAP, Gravity.CENTER))
        } else if (channels.isEmpty()) {
            status.addView(context.text("Nothing on right now", 22f, R.color.text_dim), FrameLayout.LayoutParams(WRAP, WRAP, Gravity.CENTER))
        }
        rows = newRows
        list.adapter!!.notifyDataSetChanged()
        if (rows.isEmpty()) { dTitle.text = ""; dMeta.text = "" }
        else rows.first().let { (c, ps) -> detail(c, ps.firstOrNull()) }
    }

    // A "(starting soon)" placeholder overlapping the real programme is dropped.
    private fun dedupe(ps: List<Programme>): List<Programme> {
        val out = mutableListOf<Programme>()
        for (p in ps) {
            val last = out.lastOrNull()
            if (last != null && p.s < last.e) {
                if (last.soon && !p.soon) { out[out.size - 1] = p.copy(s = maxOf(p.s, last.s)) }
                continue
            }
            out += p
        }
        return out
    }

    private fun detail(c: Channel, p: Programme?) {
        dTitle.text = p?.let { Games.title(it) } ?: c.game
        dMeta.text = buildString {
            append(c.provider)
            if (p != null) {
                append("  ·  ${fmtTime(p.s)} – ${fmtTime(p.e)}")
                if (p.soon || System.currentTimeMillis() < p.s) append("  ·  Starting soon") else append("  ·  Live")
                if (!p.d.isNullOrBlank()) append("\n${p.d}")
            }
        }
    }

    private inner class Holder(val root: LinearLayout, val icon: FrameLayout, val game: TextView, val prov: TextView, val row: TimeRow) : RecyclerView.ViewHolder(root)

    private inner class Adapter : RecyclerView.Adapter<Holder>() {
        override fun getItemCount() = rows.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
            val ctx = parent.context
            val icon = FrameLayout(ctx)
            val game = ctx.text("", 17f, bold = true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }
            val prov = ctx.text("", 14f, R.color.text_dim).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }
            val row = TimeRow(ctx, from)
            val label = LinearLayout(ctx).apply {
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, 0, ctx.dp(16), 0)
                addView(icon, lp(ctx.dp(40), ctx.dp(40)).apply { marginEnd = ctx.dp(14) })
                addView(LinearLayout(ctx).apply {
                    orientation = VERTICAL
                    addView(game, lp(MATCH)); addView(prov, lp(MATCH).apply { topMargin = ctx.dp(4) })
                }, lp(0, WRAP).apply { weight = 1f })
            }
            val root = LinearLayout(ctx).apply {
                layoutParams = RecyclerView.LayoutParams(MATCH, rowH)
                setPadding(0, ctx.dp(4), 0, ctx.dp(4))
                addView(label, lp(labelW, MATCH))
                addView(row, lp(0, MATCH).apply { weight = 1f })
            }
            return Holder(root, icon, game, prov, row)
        }

        override fun onBindViewHolder(h: Holder, pos: Int) {
            val (c, progs) = rows[pos]
            val ctx = h.root.context
            h.game.text = c.game
            h.prov.text = c.provider
            h.icon.removeAllViews()
            val logo = Assets.providerLogo(c.provider)
            val fallback = { h.icon.removeAllViews(); h.icon.addView(ctx.initials(c.provider, 40), FrameLayout.LayoutParams(MATCH, MATCH)) }
            if (logo == null) fallback() else {
                val iv = ImageView(ctx).apply { clipToOutline = true; setBackgroundResource(R.drawable.badge_avatar) }
                h.icon.addView(iv, FrameLayout.LayoutParams(MATCH, MATCH))
                iv.loadPath(ctx, logo, fallback)
            }

            h.row.from = from
            h.row.removeAllViews()
            val blocks: List<Programme?> = progs.ifEmpty { listOf(null) }
            val now = System.currentTimeMillis()
            for (p in blocks) {
                val s = p?.s ?: from
                val e = p?.e ?: (from + SPAN)
                val cell = LinearLayout(ctx).apply {
                    orientation = VERTICAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(ctx.dp(14), 0, ctx.dp(10), 0)
                    setBackgroundResource(R.drawable.prog_bg)
                    isActivated = p != null && now in p.s..p.e && !p.soon
                    isFocusable = true
                    tag = longArrayOf(s, e)
                    setOnClickListener { onPlay(c) }
                    setOnFocusChangeListener { _, f -> if (f) detail(c, p) }
                }
                val title = p?.let { Games.title(it) } ?: c.game
                cell.addView(ctx.text(title, 16f, bold = true).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END; duplicateParentStateIfFocused(ctx) })
                val meta = if (p == null) "Live stream" else if (p.soon) "Starting soon" else "${fmtTime(p.s)} – ${fmtTime(p.e)}"
                cell.addView(ctx.text(meta, 13f, R.color.text_dim).apply { maxLines = 1; duplicateParentStateIfFocused(ctx) }, lp().apply { topMargin = ctx.dp(4) })
                h.row.addView(cell)
            }
            h.row.requestLayout()
        }
    }
}

/** Keep text legible on the accent-filled focused cell. */
private fun TextView.duplicateParentStateIfFocused(ctx: Context) {
    isDuplicateParentStateEnabled = true
    val base = currentTextColor
    setTextColor(android.content.res.ColorStateList(
        arrayOf(intArrayOf(android.R.attr.state_focused), intArrayOf()),
        intArrayOf(ctx.color(R.color.text), base),
    ))
}
