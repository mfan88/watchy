import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
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
  late final Player _player = Player(configuration: const PlayerConfiguration(title: 'Watchy'));
  late final VideoController _video = VideoController(_player);
  final _subs = <StreamSubscription>[];
  String? _error;
  bool _osd = true, _buffering = true, _playing = false, _started = false;
  Timer? _hide;

  // Auto-recovery: the server's HLS muxer restarts when an upstream mirror hiccups
  // (same URL, back within ~1–2 s). Retry quietly instead of showing an error.
  static const _backoff = [0, 1000, 2000, 4000, 5000];
  static const _window = Duration(seconds: 60), _stableAfter = Duration(seconds: 10);
  int _attempt = 0;
  DateTime? _retryStart;
  Timer? _retry, _stable;
  final _focus = FocusNode();

  Channel get _ch => widget.queue[_i];

  @override
  void initState() {
    super.initState();
    _subs.addAll([
      _player.stream.buffering.listen((v) { if (mounted) setState(() => _buffering = v); }),
      _player.stream.playing.listen((v) { if (mounted) setState(() => _playing = v); }),
      // Picture on screen: playback works, so drop any earlier (recoverable) error.
      _player.stream.width.listen((w) { if (mounted && (w ?? 0) > 0) setState(() { _started = true; _error = null; }); }),
      _player.stream.position.listen((p) { if (mounted && p > Duration.zero && !_started) setState(() { _started = true; _error = null; }); }),
      // Reset the retry budget after 10 s of steady playback.
      _player.stream.playing.listen((v) {
        _stable?.cancel();
        if (v) _stable = Timer(_stableAfter, () { _attempt = 0; _retryStart = null; });
      }),
      // mpv also reports minor errors mid-play; only act when playback has actually stalled.
      _player.stream.error.listen((e) { if (!_started || !_playing || _buffering) _scheduleRetry('error: $e'); }),
      // A live stream never ends on its own: the source dropped.
      _player.stream.completed.listen((done) { if (done) _scheduleRetry('source ended'); }),
    ]);
    _tune();
  }

  void _scheduleRetry(String reason) {
    if (!mounted || _retry?.isActive == true || _error != null) return;
    _stable?.cancel();
    final now = DateTime.now();
    _retryStart ??= now;
    if (now.difference(_retryStart!) > _window) {
      setState(() { _error = 'Stream unavailable · press Enter to retry'; _buffering = false; });
      return;
    }
    final wait = _backoff[_attempt.clamp(0, _backoff.length - 1)];
    _attempt++;
    debugPrint('watchy: auto-retry #$_attempt in ${wait}ms (${reason.split('\n').first.replaceAll(RegExp(r'https?://\S+'), '<url>')})');
    setState(() => _buffering = true);
    _retry = Timer(Duration(milliseconds: wait), () { if (mounted) _player.open(Media(_ch.url)); });
  }

  void _resetRetries() { _retry?.cancel(); _stable?.cancel(); _attempt = 0; _retryStart = null; }

  @override
  void dispose() {
    _resetRetries();
    _hide?.cancel();
    for (final s in _subs) { s.cancel(); }
    _player.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _tune() async {
    _resetRetries();
    setState(() { _error = null; _started = false; _buffering = true; });
    _showOsd();
    await _player.open(Media(_ch.url));
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
    _player.playOrPause();
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
    final ready = _started && _error == null;
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
              Video(controller: _video, controls: NoVideoControls, fill: Colors.black),
              if (_error == null && (!ready || _buffering)) const Center(child: CircularProgressIndicator(color: C.text)),
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
                          Text(_ch.game, style: const TextStyle(fontFamily: titleFont, fontSize: 24, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(_error ?? '${_ch.provider}${widget.queue.length > 1 ? '  ·  ${_i + 1}/${widget.queue.length}  ·  ↑↓ change stream' : ''}',
                              style: TextStyle(color: _error != null ? C.live : C.dim, fontSize: 14)),
                        ]),
                      ),
                      if (ready)
                        IconButton(tooltip: 'Play/Pause (Space)', onPressed: _togglePause, icon: Icon(_playing ? Icons.pause : Icons.play_arrow, color: C.text)),
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
