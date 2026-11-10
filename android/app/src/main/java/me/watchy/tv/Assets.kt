package me.watchy.tv

/** Image paths served by the Watchy web app (same files as /public). */
object Assets {
    val TEAMS = setOf("ANA","BOS","BUF","CAR","CBJ","CGY","CHI","COL","DAL","DET","EDM","FLA","LAK","MIN","MTL","NJD","NSH","NYI","NYR","OTT","PHI","PIT","SEA","SJS","STL","TBL","TOR","UTA","VAN","VGK","WPG","WSH")

    fun isTeam(c: String?) = c != null && c in TEAMS
    fun teamLogo(c: String?) = if (isTeam(c)) "/teams/$c.svg" else null
    fun matchup(away: String?, home: String?) =
        if (isTeam(away) && isTeam(home) && away != home) "/matchups/${away}_vs_${home}.webp" else null

    private val RULES = listOf(
        Regex("^main feed$", RegexOption.IGNORE_CASE) to "watchy.svg",
        Regex("^espn\\s*\\+", RegexOption.IGNORE_CASE) to "espn-plus",
        Regex("^espn", RegexOption.IGNORE_CASE) to "espn",
        Regex("^(sportsnet|sn)(?=$|[\\s+\\d]|one|west|east|ontario|pacific)", RegexOption.IGNORE_CASE) to "sportsnet-all",
        Regex("^tsn", RegexOption.IGNORE_CASE) to "tsn",
        Regex("^rds", RegexOption.IGNORE_CASE) to "rds",
        Regex("^tva", RegexOption.IGNORE_CASE) to "tva-sports",
        Regex("^bein", RegexOption.IGNORE_CASE) to "bein-sports",
        Regex("^viaplay", RegexOption.IGNORE_CASE) to "viaplay",
        Regex("^v\\s*sport", RegexOption.IGNORE_CASE) to "v-sport",
        Regex("^nova\\s*sport", RegexOption.IGNORE_CASE) to "nova-sport",
        Regex("^chsn", RegexOption.IGNORE_CASE) to "chsn",
        Regex("^nhl\\s*(n$|n\\b|network)", RegexOption.IGNORE_CASE) to "nhl-network",
        Regex("^max\\s*sport", RegexOption.IGNORE_CASE) to "max-sport",
        Regex("^premier\\s*sports?", RegexOption.IGNORE_CASE) to "premier-sports",
        Regex("^sport\\s*tv", RegexOption.IGNORE_CASE) to "sport-tv",
        Regex("^(sport\\s*5|5\\s*stars?|sport\\s*five)", RegexOption.IGNORE_CASE) to "sport-five-stars",
    )

    fun providerLogo(provider: String): String? {
        val n = provider.trim()
        for ((re, key) in RULES) if (re.containsMatchIn(n)) return "/providers/" + if ('.' in key) key else "$key.webp"
        return null
    }
}
