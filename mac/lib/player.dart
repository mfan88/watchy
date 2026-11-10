import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'models.dart';
import 'ui.dart';

/// Full-window live player. Up/Down switch streams, Space pauses, Esc goes back.
class PlayerScreen extends StatefulWidget {
  final List<Channel> queue;
  final int index;
  const PlayerScreen({super.key, required this.queue, required this.index});
  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late int _i = widget.index;
  VideoPlayerController? _vc;
  String? _error;
  bool _osd = true;
  Timer? _hide;
  final _focus = FocusNode();

  Channel get _ch => widget.queue[_i];

  @override
  void initState() {
    super.initState();
    _tune();
  }

  @override
  void dispose() {
    _hide?.cancel();
    _vc?.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _tune() async {
    final old = _vc;
    final vc = VideoPlayerController.networkUrl(Uri.parse(_ch.url), formatHint: VideoFormat.hls);
    setState(() { _vc = vc; _error = null; });
    _showOsd();
    await old?.dispose();
    try {
      await vc.initialize();
      if (!mounted || _vc != vc) return;
      vc.addListener(_onTick);
      await vc.play();
      setState(() {});
    } catch (_) {
      if (mounted && _vc == vc) setState(() => _error = 'This stream has ended or is unavailable');
    }
  }

  void _onTick() {
    final v = _vc?.value;
    if (v != null && v.hasError && _error == null && mounted) setState(() => _error = 'Playback error · press Enter to retry');
  }

  void _showOsd() {
    setState(() => _osd = true);
    _hide?.cancel();
    _hide = Timer(const Duration(seconds: 4), () { if (mounted) setState(() => _osd = false); });
  }

  void _step(int d) {
    if (widget.queue.length < 2) return;
    _i = (_i + d + widget.queue.length) % widget.queue.length;
    _tune();
  }

  void _togglePause() {
    final vc = _vc;
    if (vc == null || !vc.value.isInitialized) return;
    vc.value.isPlaying ? vc.pause() : vc.play();
    _showOsd();
  }

  KeyEventResult _key(FocusNode _, KeyEvent e) {
    if (e is! KeyDownEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    if (k == LogicalKeyboardKey.escape || k == LogicalKeyboardKey.backspace) { Navigator.of(context).pop(); }
    else if (k == LogicalKeyboardKey.arrowUp || k == LogicalKeyboardKey.pageUp) { _step(-1); }
    else if (k == LogicalKeyboardKey.arrowDown || k == LogicalKeyboardKey.pageDown) { _step(1); }
    else if (k == LogicalKeyboardKey.space) { _togglePause(); }
    else if (k == LogicalKeyboardKey.enter) { _error != null ? _tune() : _showOsd(); }
    else { return KeyEventResult.ignored; }
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final vc = _vc;
    final ready = vc != null && vc.value.isInitialized;
    final sameGame = widget.queue.where((c) => c.game == _ch.game).toList();
    return Scaffold(
      backgroundColor: Colors.black,
      body: Focus(
        focusNode: _focus,
        autofocus: true,
        onKeyEvent: _key,
        child: MouseRegion(
          onHover: (_) => _showOsd(),
          cursor: _osd ? SystemMouseCursors.basic : SystemMouseCursors.none,
          child: GestureDetector(
            onTap: _togglePause,
            child: Stack(fit: StackFit.expand, children: [
              if (ready) Center(child: AspectRatio(aspectRatio: vc.value.aspectRatio, child: VideoPlayer(vc))),
              if (!ready && _error == null) const Center(child: CircularProgressIndicator(color: C.text)),
              if (ready && vc.value.isBuffering) const Center(child: CircularProgressIndicator(color: C.text)),
              AnimatedOpacity(
                opacity: _osd || _error != null ? 1 : 0,
                duration: const Duration(milliseconds: 250),
                child: Stack(children: [
                  const Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment(0, -.3), colors: [Color(0xCC000000), Color(0x00000000)]))))),
                  Positioned(
                    left: 28, top: 24, right: 28,
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      IconButton(tooltip: 'Back (Esc)', onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.arrow_back, color: C.text)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const LiveBadge(true),
                          const SizedBox(height: 8),
                          Text(_ch.game, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(_error ?? '${_ch.provider}${widget.queue.length > 1 ? '  ·  ${_i + 1}/${widget.queue.length}  ·  ↑↓ change stream' : ''}',
                              style: TextStyle(color: _error != null ? C.live : C.dim, fontSize: 14)),
                        ]),
                      ),
                      if (ready)
                        IconButton(tooltip: 'Play/Pause (Space)', onPressed: _togglePause, icon: Icon(vc.value.isPlaying ? Icons.pause : Icons.play_arrow, color: C.text)),
                    ]),
                  ),
                  if (sameGame.length > 1)
                    Positioned(
                      left: 28, right: 28, bottom: 24,
                      child: Wrap(spacing: 8, runSpacing: 8, children: [
                        for (final c in sameGame)
                          ActionChip(
                            avatar: ProviderAvatar(c.provider, size: 22),
                            label: Text(c.provider),
                            backgroundColor: c.id == _ch.id ? C.accent : const Color(0xCC1E2530),
                            side: BorderSide.none,
                            shape: const StadiumBorder(),
                            onPressed: () { _i = widget.queue.indexOf(c); _tune(); _focus.requestFocus(); },
                          ),
                      ]),
                    ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
