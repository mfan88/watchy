import 'package:flutter/material.dart';
import 'models.dart';
import 'ui.dart';

const _slot = Duration(minutes: 30);
const _slots = 6; // 3 hours on screen

/// TV-guide grid: one row per stream on a shared time axis.
class GuideView extends StatefulWidget {
  final List<Channel> channels;
  final List<Programme> programmes;
  final ValueChanged<Channel> onPlay;
  const GuideView({super.key, required this.channels, required this.programmes, required this.onPlay});
  @override
  State<GuideView> createState() => _GuideViewState();
}

class _GuideViewState extends State<GuideView> {
  (Channel, Programme?)? _sel;

  static List<Programme> _dedupe(List<Programme> ps) {
    final out = <Programme>[];
    for (final p in ps) {
      final last = out.isEmpty ? null : out.last;
      if (last != null && p.s.isBefore(last.e)) {
        if (last.soon && !p.soon) out[out.length - 1] = Programme(c: p.c, s: p.s.isAfter(last.s) ? p.s : last.s, e: p.e, t: p.t, d: p.d);
        continue;
      }
      out.add(p);
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final from = DateTime.fromMillisecondsSinceEpoch(now.millisecondsSinceEpoch - now.millisecondsSinceEpoch % _slot.inMilliseconds);
    final to = from.add(_slot * _slots);
    final byCh = <String, List<Programme>>{};
    for (final p in widget.programmes) {
      if (!p.e.isAfter(from) || !p.s.isBefore(to)) continue;
      byCh.putIfAbsent(p.c, () => []).add(p);
    }
    final rows = [
      for (final g in buildGames(widget.channels, widget.programmes))
        for (final c in g.feeds) (c, _dedupe((byCh[c.id] ?? [])..sort((a, b) => a.s.compareTo(b.s)))),
    ];
    if (rows.isEmpty) return const Center(child: Text('Nothing on right now', style: TextStyle(color: C.dim, fontSize: 18)));
    final sel = _sel ?? (rows.first.$1, rows.first.$2.firstOrNull);

    return Padding(
      padding: const EdgeInsets.fromLTRB(36, 6, 36, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(height: 86, child: _Detail(sel.$1, sel.$2)),
        LayoutBuilder(builder: (context, box) {
          final w = box.maxWidth - 280;
          return Row(children: [
            const SizedBox(width: 280, child: Text('TODAY', style: TextStyle(color: C.faint, fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w600))),
            SizedBox(
              width: w,
              height: 30,
              child: Stack(children: [
                for (var i = 0; i < _slots; i++)
                  Positioned(left: w * i / _slots, top: 6, child: Text(fmtTime(from.add(_slot * i)), style: const TextStyle(color: C.dim, fontSize: 13))),
              ]),
            ),
          ]);
        }),
        const Divider(color: C.stroke, height: 12),
        Expanded(
          child: FocusTraversalGroup(
            policy: ReadingOrderTraversalPolicy(),
            child: ListView.builder(
              padding: const EdgeInsets.only(bottom: 36),
              itemCount: rows.length,
              itemExtent: 68,
              itemBuilder: (_, i) => _Row(
                channel: rows[i].$1,
                progs: rows[i].$2,
                from: from,
                to: to,
                now: now,
                autofocus: i == 0,
                onPlay: widget.onPlay,
                onFocus: (c, p) => setState(() => _sel = (c, p)),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

class _Detail extends StatelessWidget {
  final Channel c;
  final Programme? p;
  const _Detail(this.c, this.p);
  @override
  Widget build(BuildContext context) {
    var meta = c.provider;
    if (p != null) meta += '  ·  ${fmtTime(p!.s)} – ${fmtTime(p!.e)}  ·  ${p!.soon || DateTime.now().isBefore(p!.s) ? 'Starting soon' : 'Live'}';
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(p?.title ?? c.game, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: titleFont, fontSize: 24, fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      Text(meta, style: const TextStyle(color: C.dim, fontSize: 14)),
      if (p?.d != null) Text(p!.d!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: C.dim, fontSize: 14)),
    ]);
  }
}

class _Row extends StatelessWidget {
  final Channel channel;
  final List<Programme> progs;
  final DateTime from, to, now;
  final bool autofocus;
  final ValueChanged<Channel> onPlay;
  final void Function(Channel, Programme?) onFocus;
  const _Row({required this.channel, required this.progs, required this.from, required this.to, required this.now, required this.autofocus, required this.onPlay, required this.onFocus});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        SizedBox(
          width: 280,
          child: Row(children: [
            ProviderAvatar(channel.provider, size: 36),
            const SizedBox(width: 12),
            Expanded(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(channel.game, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: titleFont, fontSize: 15, fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                Text(channel.provider, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: C.dim)),
              ]),
            ),
            const SizedBox(width: 12),
          ]),
        ),
        Expanded(
          child: LayoutBuilder(builder: (context, box) {
            final span = to.difference(from).inMilliseconds;
            double x(DateTime t) => box.maxWidth * (t.difference(from).inMilliseconds.clamp(0, span) / span);
            final blocks = progs.isEmpty ? <Programme?>[null] : progs;
            return Stack(clipBehavior: Clip.none, children: [
              for (final (k, p) in blocks.indexed)
                Positioned(
                  left: x(p?.s ?? from),
                  width: (x(p?.e ?? to) - x(p?.s ?? from) - 4).clamp(0, double.infinity),
                  top: 0,
                  bottom: 0,
                  child: Pressable(
                    autofocus: autofocus && k == 0,
                    onTap: () => onPlay(channel),
                    onFocus: (v) { if (v) onFocus(channel, p); },
                    radius: BorderRadius.circular(6),
                    color: p != null && !p.soon && !now.isBefore(p.s) && now.isBefore(p.e) ? C.surfaceHi : C.surface,
                    hoverColor: C.accent,
                    hoverBorder: null,
                    child: MouseRegion(
                      onEnter: (_) => onFocus(channel, p),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(p?.title ?? channel.game, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: titleFont, fontSize: 14, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 3),
                          Text(p == null ? 'Live stream' : p.soon ? 'Starting soon' : '${fmtTime(p.s)} – ${fmtTime(p.e)}', maxLines: 1, style: const TextStyle(fontSize: 12, color: C.dim)),
                        ]),
                      ),
                    ),
                  ),
                ),
              if (!now.isBefore(from) && now.isBefore(to))
                Positioned(left: x(now), top: -4, bottom: -4, width: 2, child: const IgnorePointer(child: ColoredBox(color: C.accent))),
            ]);
          }),
        ),
      ]),
    );
  }
}
