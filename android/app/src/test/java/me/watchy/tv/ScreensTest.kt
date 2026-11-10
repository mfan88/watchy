package me.watchy.tv

import android.widget.FrameLayout
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import org.junit.Rule
import org.junit.Test

/** Renders the TV screens on the JVM (no device needed): ./gradlew recordPaparazziDebug */
class ScreensTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.NEXUS_5.copy(screenWidth = 1920, screenHeight = 1080, xdpi = 320, ydpi = 320, density = com.android.resources.Density.XHIGH, orientation = com.android.resources.ScreenOrientation.LANDSCAPE), theme = "Theme.Watchy")

    private val now = System.currentTimeMillis()
    private val channels = listOf(
        Channel("a1", 1, "", "CAR @ EDM", "SN West", "CAR", "EDM"),
        Channel("a2", 2, "", "CAR @ EDM", "ESPN+", "CAR", "EDM"),
        Channel("a3", 3, "", "CAR @ EDM", "EDM Home", "CAR", "EDM"),
        Channel("b1", 4, "", "BOS @ TOR", "TSN4", "BOS", "TOR"),
        Channel("b2", 5, "", "BOS @ TOR", "NESN", "BOS", "TOR"),
        Channel("c1", 6, "", "VGK @ SEA", "Main feed", "VGK", "SEA"),
    )
    private val guide = Guide(now, listOf(
        Programme("a1", now - 3_600_000, now + 5_400_000, "CAR @ EDM · SN West", "Hurricanes at Oilers", false),
        Programme("a2", now - 3_600_000, now + 5_400_000, "CAR @ EDM · ESPN+", null, false),
        Programme("b1", now - 1_800_000, now + 7_200_000, "BOS @ TOR · TSN4", "Bruins at Maple Leafs", false),
        Programme("c1", now + 2_400_000, now + 13_000_000, "VGK @ SEA", null, false),
    ))

    private fun shell(content: android.view.View) = android.widget.LinearLayout(paparazzi.context).apply {
        orientation = android.widget.LinearLayout.VERTICAL
        setBackgroundColor(context.color(R.color.bg))
        addView(context.text("watchy    Home    Guide", 28f), lp().apply { setMargins(context.dp(48), context.dp(24), 0, context.dp(12)) })
        addView(content, lp(MATCH, 0).apply { weight = 1f })
    }

    @Test fun home() {
        val v = HomeView(paparazzi.context) {}
        v.bind(Games.build(channels, guide))
        paparazzi.snapshot(shell(v))
    }

    @Test fun guide() {
        val v = GuideView(paparazzi.context) {}
        v.bind(channels, guide)
        paparazzi.snapshot(shell(v))
    }
}
