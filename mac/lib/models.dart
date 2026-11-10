class Channel {
  final String id, name, game, provider, url;
  final String? away, home;
  const Channel({required this.id, required this.name, required this.game, required this.provider, required this.url, this.away, this.home});

  @override
  bool operator ==(Object other) => other is Channel && other.id == id && other.name == name && other.url == url;
  @override
  int get hashCode => Object.hash(id, name, url);
}

class Programme {
  final String c, t;
  final DateTime s, e;
  final String? d;
  final bool soon;
  const Programme({required this.c, required this.s, required this.e, required this.t, this.d, this.soon = false});

  String get title => t.split(' · ').first;
}

enum Role { home, away, other }

class Game {
  final String title;
  final List<Channel> feeds;
  final DateTime? start, end;
  final bool live;
  final String? desc;
  const Game(this.title, this.feeds, this.start, this.end, this.live, this.desc);
  String? get away => feeds.first.away;
  String? get home => feeds.first.home;
}

Role feedRole(Channel c) {
  final p = c.provider.toLowerCase();
  if (RegExp(r'\bhome\b').hasMatch(p) || (c.home != null && p.contains(c.home!.toLowerCase()))) return Role.home;
  if (RegExp(r'\baway\b').hasMatch(p) || (c.away != null && p.contains(c.away!.toLowerCase()))) return Role.away;
  return Role.other;
}

/// One entry per matchup, live first, home feed then away feed first.
List<Game> buildGames(List<Channel> channels, List<Programme> programmes, [DateTime? at]) {
  final now = at ?? DateTime.now();
  final byGame = <String, List<Channel>>{};
  for (final c in channels) {
    byGame.putIfAbsent(c.game, () => []).add(c);
  }
  final ids = {for (final c in channels) c.id: c};
  final prog = <String, Programme>{};
  for (final p in programmes) {
    if (p.e.isBefore(now) || p.soon) continue;
    final g = ids[p.c]?.game;
    if (g == null) continue;
    final cur = prog[g];
    if (cur == null || p.s.isBefore(cur.s)) prog[g] = p;
  }
  var i = 0;
  final games = byGame.entries.map((e) {
    final p = prog[e.key];
    final feeds = [...e.value]..sort((a, b) => feedRole(a).index - feedRole(b).index);
    return (i++, Game(e.key, feeds, p?.s, p?.e, p == null || !now.isBefore(p.s), p?.d));
  }).toList()
    ..sort((a, b) {
      if (a.$2.live != b.$2.live) return a.$2.live ? -1 : 1;
      final c = (a.$2.start ?? DateTime(0)).compareTo(b.$2.start ?? DateTime(0));
      return c != 0 ? c : a.$1 - b.$1;
    });
  return games.map((e) => e.$2).toList();
}
