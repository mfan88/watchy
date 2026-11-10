import 'package:flutter/material.dart';
import 'models.dart';
import 'ui.dart';

class HomeView extends StatelessWidget {
  final List<Game> games;
  final String? error;
  final ValueChanged<Channel> onPlay;
  const HomeView({super.key, required this.games, required this.onPlay, this.error});

  @override
  Widget build(BuildContext context) {
    if (games.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(error != null ? "Can't reach the stream server" : 'No live games right now', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          Text(error ?? 'Games appear here when they start. This window refreshes automatically.', style: const TextStyle(color: C.dim, fontSize: 15)),
        ]),
      );
    }
    return FocusTraversalGroup(
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(36, 14, 36, 40),
        itemCount: games.length,
        separatorBuilder: (_, __) => const SizedBox(height: 28),
        itemBuilder: (_, i) => _GameRow(games[i], onPlay, autofocus: i == 0),
      ),
    );
  }
}

class _GameRow extends StatelessWidget {
  final Game g;
  final ValueChanged<Channel> onPlay;
  final bool autofocus;
  const _GameRow(this.g, this.onPlay, {this.autofocus = false});

  @override
  Widget build(BuildContext context) {
    var sub = '';
    if (g.start != null && g.end != null) sub = '${fmtTime(g.start!)} – ${fmtTime(g.end!)}';
    if (g.desc?.isNotEmpty ?? false) sub += '${sub.isEmpty ? '' : '  ·  '}${g.desc}';
    if (sub.isEmpty) sub = g.live ? 'Live now' : 'Starting soon';

    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(
        width: 320,
        height: 180,
        child: Pressable(
          autofocus: autofocus,
          onTap: () => onPlay(g.feeds.first),
          child: Stack(fit: StackFit.expand, children: [
            MatchupArt(g),
            const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment(0, .2), colors: [Color(0xE60B0E13), Color(0x000B0E13)]))),
            Positioned(left: 12, top: 12, child: LiveBadge(g.live)),
            const Positioned(left: 14, bottom: 12, child: Row(children: [Icon(Icons.play_arrow_rounded, size: 20), SizedBox(width: 4), Text('Watch', style: TextStyle(fontWeight: FontWeight.w600))])),
          ]),
        ),
      ),
      const SizedBox(width: 28),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 4),
          Text(g.title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.dim, fontSize: 14)),
          const SizedBox(height: 18),
          Text('${g.feeds.length} ${g.feeds.length == 1 ? 'STREAM' : 'STREAMS'}', style: const TextStyle(color: C.faint, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          Wrap(spacing: 10, runSpacing: 10, children: [for (final c in g.feeds) _FeedChip(c, () => onPlay(c))]),
        ]),
      ),
    ]);
  }
}

class _FeedChip extends StatelessWidget {
  final Channel c;
  final VoidCallback onTap;
  const _FeedChip(this.c, this.onTap);
  @override
  Widget build(BuildContext context) {
    final role = feedRole(c);
    final showRole = role != Role.other && !RegExp(r'\b(home|away)\b', caseSensitive: false).hasMatch(c.provider);
    return Pressable(
      onTap: onTap,
      color: C.surfaceHi,
      hoverColor: C.accent,
      hoverBorder: null,
      radius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          ProviderAvatar(c.provider, size: 32),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(c.provider, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            if (showRole) Text(role == Role.home ? 'Home feed' : 'Away feed', style: const TextStyle(fontSize: 11, color: C.dim)),
          ]),
        ]),
      ),
    );
  }
}
