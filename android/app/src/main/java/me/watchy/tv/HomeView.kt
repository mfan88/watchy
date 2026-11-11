package me.watchy.tv

import android.annotation.SuppressLint
import android.content.Context
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

/** Home: one row per game; the big tile plays the first feed, the chips beside it jump straight into each feed. */
@SuppressLint("ViewConstructor")
class HomeView(ctx: Context, private val onPlay: (Channel) -> Unit) : FrameLayout(ctx) {
    var error: String? = null
    private val list = RecyclerView(ctx).apply {
        layoutManager = LinearLayoutManager(ctx)
        clipToPadding = false
        setPadding(ctx.dp(48), ctx.dp(8), ctx.dp(48), ctx.dp(48))
        itemAnimator = null
        descendantFocusability = ViewGroup.FOCUS_AFTER_DESCENDANTS
    }
    private val adapter = Adapter()
    private val empty = LinearLayout(ctx).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
    }

    init {
        list.adapter = adapter
        addView(list, LayoutParams(MATCH, MATCH))
        addView(empty, LayoutParams(MATCH, MATCH))
    }

    fun bind(games: List<Game>?) {
        empty.removeAllViews()
        val ctx = context
        when {
            games == null -> empty.addView(ProgressBar(ctx).apply { isIndeterminate = true })
            games.isEmpty() -> {
                empty.addView(ctx.text(if (error != null) "Can't reach the server" else "No live games right now", 26f, bold = true))
                empty.addView(ctx.text(error ?: "Games appear here when they start. This screen refreshes automatically.", 17f, R.color.text_dim).apply {
                    setPadding(0, ctx.dp(10), 0, 0)
                })
            }
        }
        empty.visibility = if (games.isNullOrEmpty()) View.VISIBLE else View.GONE
        adapter.submit(games.orEmpty())
    }

    private inner class Holder(val root: LinearLayout) : RecyclerView.ViewHolder(root)

    private inner class Adapter : RecyclerView.Adapter<Holder>() {
        var items: List<Game> = emptyList()

        @SuppressLint("NotifyDataSetChanged")
        fun submit(g: List<Game>) {
            if (g == items) return // unchanged: keep focus where it is
            val focused = list.findFocus()
            items = g
            notifyDataSetChanged()
            if (focused != null) list.post { if (list.findFocus() == null) list.getChildAt(0)?.let { focusFirst(it) } }
        }

        private fun focusFirst(v: View) { (v as? ViewGroup)?.getChildAt(0)?.requestFocus() }

        override fun getItemCount() = items.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(LinearLayout(parent.context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
            setPadding(0, context.dp(14), 0, context.dp(14))
            clipChildren = false
            clipToPadding = false
        })

        override fun onBindViewHolder(h: Holder, pos: Int) {
            val g = items[pos]
            val ctx = h.root.context
            h.root.removeAllViews()

            // Tile
            val tile = FrameLayout(ctx).apply {
                setBackgroundResource(R.drawable.card_bg)
                isFocusable = true
                setPadding(ctx.dp(3), ctx.dp(3), ctx.dp(3), ctx.dp(3))
                focusZoom(1.04f)
                setOnClickListener { onPlay(g.feeds.first()) }
            }
            val img = ImageView(ctx).apply { scaleType = ImageView.ScaleType.CENTER_CROP; clipToOutline = true; setBackgroundResource(R.drawable.img_clip) }
            tile.addView(img, LayoutParams(MATCH, MATCH))
            val pair = LinearLayout(ctx).apply { gravity = Gravity.CENTER; visibility = View.GONE }
            tile.addView(pair, LayoutParams(MATCH, MATCH))
            img.loadPath(ctx, Assets.matchup(g.away, g.home)) { showPair(ctx, pair, g) }
            tile.addView(View(ctx).apply { setBackgroundResource(R.drawable.scrim) }, LayoutParams(MATCH, ctx.dp(70), Gravity.BOTTOM))
            tile.addView(ctx.badge(g.live), LayoutParams(WRAP, WRAP, Gravity.TOP or Gravity.START).apply { setMargins(ctx.dp(12), ctx.dp(12), 0, 0) })
            tile.addView(ctx.text("▶  Watch", 14f, label = true), LayoutParams(WRAP, WRAP, Gravity.BOTTOM or Gravity.START).apply { setMargins(ctx.dp(14), 0, 0, ctx.dp(12)) })
            h.root.addView(tile, lp(ctx.dp(352), ctx.dp(198)))

            // Details + feeds
            val info = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(ctx.dp(28), ctx.dp(4), 0, 0)
                clipChildren = false
                clipToPadding = false
            }
            info.addView(ctx.text(g.title, 28f, bold = true))
            val sub = buildString {
                if (g.start != null && g.end != null) append("${fmtTime(g.start)} – ${fmtTime(g.end)}")
                if (!g.desc.isNullOrBlank()) { if (isNotEmpty()) append("  ·  "); append(g.desc) }
                if (isEmpty()) append(if (g.live) "Live now" else "Starting soon")
            }
            info.addView(ctx.text(sub, 16f, R.color.text_dim).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }, lp().apply { topMargin = ctx.dp(8) })
            info.addView(ctx.text("${g.feeds.size} ${if (g.feeds.size == 1) "STREAM" else "STREAMS"}", 12f, R.color.text_faint, label = true).apply { letterSpacing = 0.1f }, lp().apply { topMargin = ctx.dp(22); bottomMargin = ctx.dp(10) })

            val feeds = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL; clipChildren = false; clipToPadding = false }
            for (c in g.feeds) feeds.addView(feedChip(ctx, c), lp().apply { marginEnd = ctx.dp(12) })
            info.addView(android.widget.HorizontalScrollView(ctx).apply {
                isHorizontalScrollBarEnabled = false
                clipChildren = false
                clipToPadding = false
                setPadding(ctx.dp(4), ctx.dp(6), ctx.dp(24), ctx.dp(6))
                addView(feeds)
            }, lp(MATCH))
            h.root.addView(info, lp(0, WRAP).apply { weight = 1f })
        }
    }

    private fun showPair(ctx: Context, pair: LinearLayout, g: Game) {
        pair.visibility = View.VISIBLE
        pair.removeAllViews()
        if (Assets.isTeam(g.away) && Assets.isTeam(g.home)) {
            for ((i, code) in listOf(g.away, g.home).withIndex()) {
                if (i == 1) pair.addView(ctx.text("@", 22f, R.color.text_faint, label = true), lp().apply { setMargins(ctx.dp(18), 0, ctx.dp(18), 0) })
                pair.addView(ImageView(ctx).apply { loadPath(ctx, Assets.teamLogo(code)) }, lp(ctx.dp(84), ctx.dp(84)))
            }
        } else {
            pair.addView(Wordmark.view(ctx, 34f))
        }
    }

    private fun feedChip(ctx: Context, c: Channel): View {
        val chip = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundResource(R.drawable.feed_bg)
            setPadding(ctx.dp(10), ctx.dp(10), ctx.dp(18), ctx.dp(10))
            isFocusable = true
            focusZoom(1.06f)
            setOnClickListener { onPlay(c) }
        }
        val size = ctx.dp(36)
        val logo = Assets.providerLogo(c.provider)
        val holder = FrameLayout(ctx)
        if (logo != null) {
            val iv = ImageView(ctx).apply { scaleType = ImageView.ScaleType.FIT_CENTER; clipToOutline = true; setBackgroundResource(R.drawable.badge_avatar) }
            holder.addView(iv, FrameLayout.LayoutParams(size, size))
            iv.loadPath(ctx, logo) { holder.removeAllViews(); holder.addView(ctx.initials(c.provider, 36), FrameLayout.LayoutParams(size, size)) }
        } else holder.addView(ctx.initials(c.provider, 36), FrameLayout.LayoutParams(size, size))
        chip.addView(holder, lp(size, size).apply { marginEnd = ctx.dp(12) })
        val col = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        col.addView(ctx.text(c.provider, 16f, label = true).apply { maxLines = 1 })
        val role = when (Games.feedRole(c)) {
            Games.Role.HOME -> "Home feed"; Games.Role.AWAY -> "Away feed"; else -> null
        }
        if (role != null && !Regex("\\b(home|away)\\b", RegexOption.IGNORE_CASE).containsMatchIn(c.provider)) col.addView(ctx.text(role, 12f, R.color.text_dim), lp().apply { topMargin = ctx.dp(3) })
        chip.addView(col)
        return chip
    }
}
