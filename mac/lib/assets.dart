const _teams = {'ANA','BOS','BUF','CAR','CBJ','CGY','CHI','COL','DAL','DET','EDM','FLA','LAK','MIN','MTL','NJD','NSH','NYI','NYR','OTT','PHI','PIT','SEA','SJS','STL','TBL','TOR','UTA','VAN','VGK','WPG','WSH'};
const _root = 'assets/public';

bool isTeam(String? c) => c != null && _teams.contains(c);
String? teamLogo(String? c) => isTeam(c) ? '$_root/teams/$c.svg' : null;
String? matchupImage(String? away, String? home) =>
    isTeam(away) && isTeam(home) && away != home ? '$_root/matchups/${away}_vs_$home.webp' : null;

final _rules = <(RegExp, String)>[
  (RegExp(r'^main feed$', caseSensitive: false), 'watchy.svg'),
  (RegExp(r'^espn\s*\+', caseSensitive: false), 'espn-plus'),
  (RegExp(r'^espn', caseSensitive: false), 'espn'),
  (RegExp(r'^(sportsnet|sn)(?=$|[\s+\d]|one|west|east|ontario|pacific)', caseSensitive: false), 'sportsnet-all'),
  (RegExp(r'^tsn', caseSensitive: false), 'tsn'),
  (RegExp(r'^rds', caseSensitive: false), 'rds'),
  (RegExp(r'^tva', caseSensitive: false), 'tva-sports'),
  (RegExp(r'^bein', caseSensitive: false), 'bein-sports'),
  (RegExp(r'^viaplay', caseSensitive: false), 'viaplay'),
  (RegExp(r'^v\s*sport', caseSensitive: false), 'v-sport'),
  (RegExp(r'^nova\s*sport', caseSensitive: false), 'nova-sport'),
  (RegExp(r'^chsn', caseSensitive: false), 'chsn'),
  (RegExp(r'^nhl\s*(n$|n\b|network)', caseSensitive: false), 'nhl-network'),
  (RegExp(r'^max\s*sport', caseSensitive: false), 'max-sport'),
  (RegExp(r'^premier\s*sports?', caseSensitive: false), 'premier-sports'),
  (RegExp(r'^sport\s*tv', caseSensitive: false), 'sport-tv'),
  (RegExp(r'^(sport\s*5|5\s*stars?|sport\s*five)', caseSensitive: false), 'sport-five-stars'),
];

String? providerLogo(String provider) {
  final n = provider.trim();
  for (final (re, key) in _rules) {
    if (re.hasMatch(n)) return '$_root/providers/${key.contains('.') ? key : '$key.webp'}';
  }
  return null;
}
