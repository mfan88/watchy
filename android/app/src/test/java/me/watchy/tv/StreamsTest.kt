package me.watchy.tv

import org.junit.Assert.assertEquals
import org.junit.Test

class StreamsTest {
    private val ts = "https://tv.example/s3cr3t/ch_0a1b/index.m3u8"

    @Test fun fmp4InsertsAfterKey() {
        assertEquals("https://tv.example/s3cr3t/fmp4/ch_0a1b/index.m3u8", Streams.urlFor(ts, StreamFormat.FMP4, "s3cr3t"))
        assertEquals("https://tv.example/s3cr3t/fmp4/ch_0a1b/index.m3u8?x=1", Streams.urlFor("$ts?x=1", StreamFormat.FMP4, "s3cr3t"))
        assertEquals(ts, Streams.urlFor(ts, StreamFormat.TS, "s3cr3t"))
    }

    @Test fun onlyChannelUrlsAreRewritten() {
        assertEquals(ts, Streams.urlFor(ts, StreamFormat.FMP4, "other"))
        val odd = "https://tv.example/s3cr3t/live/index.m3u8"
        assertEquals(odd, Streams.urlFor(odd, StreamFormat.FMP4, "s3cr3t"))
    }

    @Test fun channelKeyHasNoSecret() {
        assertEquals("ch_0a1b", Streams.channelKey(ts))
        assertEquals("ch_0a1b", Streams.channelKey(Streams.urlFor(ts, StreamFormat.FMP4, "s3cr3t")))
        assertEquals(StreamFormat.FMP4, StreamFormat.TS.other)
        assertEquals(StreamFormat.FMP4, Streams.preferredFormat())
    }
}
