import 'dart:async';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'guide.dart';
import 'home.dart';
import 'models.dart';
import 'player.dart';
import 'setup.dart';
import 'updater.dart';
import 'ui.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
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
  late bool _ready = widget.api.signedIn;
  String? _setupError;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Watchy',
        debugShowCheckedModeBanner: false,
        theme: watchyTheme(),
        home: _ready
            ? Shell(api: widget.api, onSignOut: (e) => setState(() { widget.api.signOut(); _setupError = e; _ready = false; }))
            : SetupScreen(api: widget.api, error: _setupError, onDone: () => setState(() => _ready = true)),
      );
}

class Shell extends StatefulWidget {
  final Api api;
  final ValueChanged<String?> onSignOut;
  const Shell({super.key, required this.api, required this.onSignOut});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _tab = 0;
  List<Channel>? _channels;
  List<Programme> _guide = const [];
  String? _error;
  Timer? _refresh, _tick, _updates;
  Update? _update;

  @override
  void initState() {
    super.initState();
    _load();
    // Re-check the saved login on every launch: removed accounts are signed out,
    // a rotated key is picked up. Offline is fine: keep the key we have.
    widget.api.refresh().catchError((Object e) { if (e is AuthException && mounted) widget.onSignOut(e.message); });
    _checkUpdate();
    _updates = Timer.periodic(const Duration(hours: 6), (_) => _checkUpdate());
    _refresh = Timer.periodic(const Duration(minutes: 2), (_) => _load());
    _tick = Timer.periodic(const Duration(seconds: 30), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _refresh?.cancel();
    _tick?.cancel();
    _updates?.cancel();
    super.dispose();
  }

  void _checkUpdate() => Updater.check().then((u) { if (mounted && u != null) setState(() => _update = u); });

  Future<void> _load() async {
    try {
      final ch = await widget.api.channels();
      List<Programme>? g;
      try { g = await widget.api.guide(); } catch (_) {}
      if (!mounted) return;
      setState(() { _channels = ch; _guide = g ?? _guide; _error = null; });
    } on AuthException catch (e) {
      if (mounted) widget.onSignOut(e.message);
    } on ApiException catch (e) {
      if (!mounted) return;
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
            textStyle: const TextStyle(fontFamily: titleFont, fontSize: 15, fontWeight: FontWeight.w600),
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
            if (_update != null)
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: FilledButton.icon(
                  onPressed: () => installUpdate(context, _update!),
                  style: FilledButton.styleFrom(backgroundColor: C.accent, foregroundColor: C.text),
                  icon: const Icon(Icons.system_update_alt, size: 18),
                  label: Text('Update to ${_update!.version}'),
                ),
              ),
            if (_error != null) Padding(padding: const EdgeInsets.only(right: 16), child: Text(_error!, style: const TextStyle(color: C.live, fontSize: 13))),
            Text(fmtTime(DateTime.now()), style: const TextStyle(color: C.dim, fontSize: 15)),
            const SizedBox(width: 8),
            IconButton(tooltip: 'Refresh', onPressed: _load, icon: const Icon(Icons.refresh, color: C.dim, size: 20)),
            IconButton(tooltip: 'Sign out', onPressed: () => widget.onSignOut(null), icon: const Icon(Icons.logout, color: C.dim, size: 20)),
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
