import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'ui.dart';

/// Self-update from GitHub Releases: Windows runs the new installer silently,
/// macOS swaps in the app from the new DMG, Linux replaces the AppImage.
const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '0.0.0');
const _repo = String.fromEnvironment('UPDATE_REPO', defaultValue: 'mfan88/watchy');

class Update {
  final String version, url, name;
  const Update(this.version, this.url, this.name);
}

bool isNewer(String latest, String current) {
  List<int> parts(String v) => v.replaceFirst(RegExp(r'^[vV]'), '').split(RegExp(r'[.-]')).map((e) => int.tryParse(e) ?? 0).toList();
  final a = parts(latest), b = parts(current);
  for (var i = 0; i < (a.length > b.length ? a.length : b.length); i++) {
    final x = i < a.length ? a[i] : 0, y = i < b.length ? b[i] : 0;
    if (x != y) return x > y;
  }
  return false;
}

class Updater {
  /// Which release asset this install can update itself from, or null.
  static bool Function(String name)? get _wanted {
    if (Platform.isWindows) return (n) => n.endsWith('-setup.exe');
    if (Platform.isMacOS) return (n) => n.endsWith('.dmg');
    if (Platform.isLinux && Platform.environment['APPIMAGE'] != null) return (n) => n.endsWith('-x86_64.AppImage');
    return null;
  }

  static Future<Update?> check() async {
    final wanted = _wanted;
    if (wanted == null || appVersion == '0.0.0') return null; // dev builds and tar.gz installs don't self-update
    try {
      final r = await http.get(Uri.parse('https://api.github.com/repos/$_repo/releases/latest'), headers: {'Accept': 'application/vnd.github+json'}).timeout(const Duration(seconds: 20));
      if (r.statusCode != 200) return null;
      final j = jsonDecode(r.body) as Map<String, dynamic>;
      final tag = j['tag_name'] as String? ?? '';
      if (!isNewer(tag, appVersion)) return null;
      for (final a in (j['assets'] as List? ?? const [])) {
        final name = a['name'] as String? ?? '';
        if (wanted(name)) return Update(tag.replaceFirst(RegExp(r'^[vV]'), ''), a['browser_download_url'] as String, name);
      }
    } catch (_) {}
    return null;
  }
}

Future<void> installUpdate(BuildContext context, Update u) async {
  final status = ValueNotifier<String>('Downloading Watchy ${u.version}…');
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => AlertDialog(
      backgroundColor: C.surface,
      content: Row(children: [
        const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: C.accent)),
        const SizedBox(width: 18),
        Expanded(child: ValueListenableBuilder(valueListenable: status, builder: (_, s, __) => Text(s))),
      ]),
    ),
  );
  try {
    final dir = await Directory.systemTemp.createTemp('watchy-update');
    final file = File('${dir.path}/${u.name}');
    final res = await http.Client().send(http.Request('GET', Uri.parse(u.url)));
    if (res.statusCode != 200) throw 'HTTP ${res.statusCode}';
    await res.stream.pipe(file.openWrite());
    status.value = 'Installing…';
    await _apply(file);
  } catch (e) {
    if (context.mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Update failed: $e")));
    }
  }
}

Future<void> _apply(File f) async {
  if (Platform.isWindows) {
    // Inno Setup: install silently over the current version, then relaunch (see installer.iss).
    await Process.start(f.path, ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CLOSEAPPLICATIONS'], mode: ProcessStartMode.detached);
    exit(0);
  }
  if (Platform.isMacOS) {
    // .../Watchy.app/Contents/MacOS/Watchy -> .../Watchy.app
    final app = File(Platform.resolvedExecutable).parent.parent.parent.path;
    final script = '''
set -e
while kill -0 \$PPID_WATCHY 2>/dev/null; do sleep 0.3; done
MNT=\$(mktemp -d)
hdiutil attach -nobrowse -readonly -mountpoint "\$MNT" "${f.path}"
rm -rf "$app"
ditto "\$MNT/Watchy.app" "$app"
hdiutil detach "\$MNT" -quiet || true
xattr -dr com.apple.quarantine "$app" 2>/dev/null || true
open "$app"
''';
    await Process.start('/bin/bash', ['-c', script], mode: ProcessStartMode.detached, environment: {'PPID_WATCHY': '$pid'});
    exit(0);
  }
  if (Platform.isLinux) {
    final current = Platform.environment['APPIMAGE']!;
    await Process.run('chmod', ['+x', f.path]);
    final tmp = '$current.new';
    await f.copy(tmp);
    await Process.run('chmod', ['+x', tmp]);
    await File(tmp).rename(current); // atomic replace on the same filesystem
    await Process.start(current, const [], mode: ProcessStartMode.detached);
    exit(0);
  }
}
