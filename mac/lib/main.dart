import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'guide.dart';
import 'home.dart';
import 'models.dart';
import 'player.dart';
import 'setup.dart';
import 'ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = Api(await SharedPreferences.getInstance());
  runApp(WatchyApp(api));
}

class WatchyApp extends StatefulWidget {
  final Api api;
  const WatchyApp(this.api, {super.key});
  @override
  State<WatchyApp> createState() => _WatchyAppState();
}

class _WatchyAppState extends State<WatchyApp> {
  late bool _ready = widget.api.secret.isNotEmpty;
  String? _setupError;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Watchy',
        debugShowCheckedModeBanner: false,
        theme: watchyTheme(),
        home: _ready
            ? Shell(api: widget.api, onBadKey: (e) => setState(() { widget.api.forget(); _setupError = e; _ready = false; }))
            : SetupScreen(api: widget.api, error: _setupError, onDone: () => setState(() => _ready = true)),
      );
}

class Shell extends StatefulWidget {
  final Api api;
  final ValueChanged<String> onBadKey;
  const Shell({super.key, required this.api, required this.onBadKey});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _tab = 0;
  List<Channel>? _channels;
  List<Programme> _guide = const [];
  String? _error;
  Timer? _refresh, _tick;

  @override
  void initState() {
    super.initState();
    _load();
    _refresh = Timer.periodic(const Duration(minutes: 2), (_) => _load());
    _tick = Timer.periodic(const Duration(seconds: 30), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _refresh?.cancel();
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final ch = await widget.api.channels();
      List<Programme>? g;
      try { g = await widget.api.guide(); } catch (_) {}
      if (!mounted) return;
      setState(() { _channels = ch; _guide = g ?? _guide; _error = null; });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.badKey && !Api.bundled) return widget.onBadKey(e.message);
      setState(() { _channels ??= const []; _error = e.message; });
    }
  }

  void _play(Channel c) {
    final games = buildGames(_channels ?? const [], _guide);
    final queue = [for (final g in games) ...g.feeds];
    Navigator.of(context).push(PageRouteBuilder(
      pageBuilder: (_, __, ___) => PlayerScreen(queue: queue, index: queue.indexWhere((x) => x.id == c.id).clamp(0, queue.length - 1)),
      transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
    ));
  }

  @override
  Widget build(BuildContext context) {
    Widget tab(String label, int i) {
      final sel = _tab == i;
      return Padding(
        padding: const EdgeInsets.only(right: 6),
        child: TextButton(
          onPressed: () => setState(() => _tab = i),
          style: TextButton.styleFrom(
            backgroundColor: sel ? C.surfaceHi : Colors.transparent,
            foregroundColor: sel ? C.text : C.dim,
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          child: Text(label),
        ),
      );
    }

    final live = (_channels == null) ? null : buildGames(_channels!, _guide);
    return Scaffold(
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(36, 22, 36, 10),
          child: Row(children: [
            const Wordmark(size: 28),
            const SizedBox(width: 32),
            tab('Home', 0),
            tab('Guide', 1),
            const Spacer(),
            if (_error != null) Padding(padding: const EdgeInsets.only(right: 16), child: Text(_error!, style: const TextStyle(color: C.live, fontSize: 13))),
            Text(fmtTime(DateTime.now()), style: const TextStyle(color: C.dim, fontSize: 15)),
            const SizedBox(width: 8),
            IconButton(tooltip: 'Refresh', onPressed: _load, icon: const Icon(Icons.refresh, color: C.dim, size: 20)),
            if (!Api.bundled)
              IconButton(tooltip: 'Change access key', onPressed: () => widget.onBadKey(''), icon: const Icon(Icons.key_outlined, color: C.dim, size: 20)),
          ]),
        ),
        Expanded(
          child: live == null
              ? const Center(child: CircularProgressIndicator(color: C.accent))
              : _tab == 0
                  ? HomeView(games: live, error: _error, onPlay: _play)
                  : GuideView(channels: _channels!, programmes: _guide, onPlay: _play),
        ),
      ]),
    );
  }
}
