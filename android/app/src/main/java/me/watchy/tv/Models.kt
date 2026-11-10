package me.watchy.tv

import org.json.JSONObject

data class Channel(
    val id: String, val no: Int, val name: String, val game: String,
    val provider: String, val away: String?, val home: String?,
) {
    companion object {
        fun from(j: JSONObject) = Channel(
            j.getString("id"), j.optInt("no"), j.optString("name"), j.optString("game"),
            j.optString("provider", "Main feed"),
            j.optString("away").ifEmpty { null }, j.optString("home").ifEmpty { null },
        )
    }
}

data class Programme(val c: String, val s: Long, val e: Long, val t: String, val d: String?, val soon: Boolean) {
    companion object {
        fun from(j: JSONObject) = Programme(
            j.getString("c"), j.getLong("s"), j.getLong("e"), j.optString("t"),
            j.optString("d").ifEmpty { null }, j.optBoolean("soon"),
        )
    }
}

data class Guide(val now: Long, val programmes: List<Programme>)

/** One matchup with all of its feeds. */
data class Game(val title: String, val feeds: List<Channel>, val start: Long?, val end: Long?, val live: Boolean, val desc: String?) {
    val away get() = feeds.first().away
    val home get() = feeds.first().home
}

object Games {
    private const val SEP = " · "

    fun build(channels: List<Channel>, guide: Guide?): List<Game> {
        val now = System.currentTimeMillis()
        val byGame = LinkedHashMap<String, MutableList<Channel>>()
        for (c in channels) byGame.getOrPut(c.game) { mutableListOf() }.add(c)
        val ids = channels.associateBy { it.id }
        // Real (non-placeholder) programme per game title, current or next.
        val prog = HashMap<String, Programme>()
        guide?.programmes?.forEach { p ->
            if (p.e < now || p.soon) return@forEach
            val g = ids[p.c]?.game ?: return@forEach
            val cur = prog[g]
            if (cur == null || p.s < cur.s) prog[g] = p
        }
        return byGame.map { (title, feeds) ->
            val p = prog[title]
            Game(title, sortFeeds(feeds), p?.s, p?.e, p == null || now >= p.s, p?.d)
        }.sortedWith(compareBy<Game> { !it.live }.thenBy { it.start ?: 0L })
    }

    /** Home-team feed first, then away, then the rest. */
    private fun sortFeeds(feeds: List<Channel>) = feeds.sortedBy { feedRole(it).ordinal }

    enum class Role { HOME, AWAY, OTHER }

    fun feedRole(c: Channel): Role {
        val p = c.provider.lowercase()
        return when {
            Regex("\\bhome\\b").containsMatchIn(p) || (c.home != null && p.contains(c.home.lowercase())) -> Role.HOME
            Regex("\\baway\\b").containsMatchIn(p) || (c.away != null && p.contains(c.away.lowercase())) -> Role.AWAY
            else -> Role.OTHER
        }
    }

    fun title(p: Programme) = p.t.substringBefore(SEP)
}
