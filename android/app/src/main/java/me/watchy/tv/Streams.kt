package me.watchy.tv

import android.content.Context

/** Settings → Playback → Stream format. Persisted per device. */
enum class StreamFormat(val label: String, val hint: String) {
    AUTO("Auto", "Picks the best format for this device and switches if a channel won't start."),
    FMP4("fMP4", "Fragmented MP4 HLS. Plays channels with more than one audio track."),
    TS("MPEG-TS", "Classic HLS. Channels with more than one audio track won't play.");

    val other get() = if (this == TS) FMP4 else TS
}

/**
 * Which HLS flavour to request. The stream server serves every channel as
 *   MPEG-TS: {base}/{secret}/ch_xxx/index.m3u8        (what playlist.m3u lists)
 *   fMP4:    {base}/{secret}/fmp4/ch_xxx/index.m3u8
 */
object Streams {
    private const val PREF = "streamFormat"

    /**
     * Auto's first choice on this device. Android TV / Google TV / Fire TV all play through
     * ExoPlayer (Media3), which handles fMP4 HLS (EXT-X-MAP, multiple audio renditions).
     * The other apps keep the same table in mac/lib/streams.dart and tizen/js/app.js.
     */
    fun preferredFormat(): StreamFormat = StreamFormat.FMP4

    /** Format that actually worked per channel this session (Auto only). */
    private val working = HashMap<String, StreamFormat>()

    fun setting(ctx: Context): StreamFormat {
        val v = ctx.getSharedPreferences("watchy", Context.MODE_PRIVATE).getString(PREF, null)
        return StreamFormat.entries.firstOrNull { it.name == v } ?: StreamFormat.AUTO
    }

    fun setSetting(ctx: Context, f: StreamFormat) {
        ctx.getSharedPreferences("watchy", Context.MODE_PRIVATE).edit().putString(PREF, f.name).apply()
    }

    /** Concrete format (never AUTO) for a channel, plus why it was picked (for the debug log). */
    fun choose(ctx: Context, channel: String): Pair<StreamFormat, String> {
        val s = setting(ctx)
        if (s != StreamFormat.AUTO) return s to "setting"
        working[channel]?.let { return it to "worked earlier this session" }
        return preferredFormat() to "platform default"
    }

    fun remember(channel: String, f: StreamFormat) { working[channel] = f }

    private val slugRe = Regex("/(ch_[0-9a-f]+)/")

    /** Channel slug (ch_xxx) from a stream URL; the URL itself if it has none. Never contains the key. */
    fun channelKey(url: String): String = slugRe.find(url)?.groupValues?.get(1) ?: url.substringAfterLast('/')

    /** The playlist's MPEG-TS URL rewritten for [f]. Only {base}/{secret}/ch_xxx/… URLs are rewritten. */
    fun urlFor(tsUrl: String, f: StreamFormat, secret: String): String {
        if (f != StreamFormat.FMP4 || secret.isEmpty()) return tsUrl
        val m = Regex("^([a-zA-Z][\\w+.-]*://[^/?#]*)(/[^?#]*)(.*)$").find(tsUrl) ?: return tsUrl
        val (origin, path, rest) = m.destructured
        val prefix = "/$secret/"
        if (!path.startsWith(prefix) || !Regex("^ch_[0-9a-f]+/").containsMatchIn(path.substring(prefix.length))) return tsUrl
        return origin + prefix + "fmp4/" + path.substring(prefix.length) + rest
    }
}
