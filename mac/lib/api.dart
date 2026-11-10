import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'models.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  bool get badKey => message.startsWith('Access key');
  @override
  String toString() => message;
}

/// Reads the playlist and guide straight from the stream server, the same
/// source the website's server reads. The key is baked in with
/// --dart-define=HTV_SECRET=... or entered once in the app.
class Api {
  static const _bundledSecret = String.fromEnvironment('HTV_SECRET');
  static const base = String.fromEnvironment('HTV_BASE_URL', defaultValue: 'https://tv.zuxi.me');
  static bool get bundled => _bundledSecret.isNotEmpty;

  final SharedPreferences prefs;
  Api(this.prefs);

  String get secret => bundled ? _bundledSecret : (prefs.getString('secret') ?? '');
  set secret(String v) => prefs.setString('secret', v.trim().replaceAll(RegExp(r'^/+|/+$'), ''));
  void forget() => prefs.remove('secret');

  Future<String> _get(String file) async {
    final uri = Uri.tryParse('${base.replaceAll(RegExp(r'/+$'), '')}/$secret/$file');
    if (uri == null) throw ApiException('Access key not accepted');
    http.Response r;
    try {
      r = await http.get(uri).timeout(const Duration(seconds: 20));
    } catch (_) {
      throw ApiException("Can't reach the stream server");
    }
    if (r.statusCode == 401 || r.statusCode == 403 || r.statusCode == 404) {
      throw ApiException('Access key not accepted (${r.statusCode})');
    }
    if (r.statusCode >= 300) throw ApiException('Stream server error ${r.statusCode}');
    return r.body;
  }

  Future<List<Channel>> channels() async => parseM3U(await _get('playlist.m3u'));
  Future<List<Programme>> guide() async => parseXmltv(await _get('guide.xml'));
}

const _sep = ' · ';

List<Channel> parseM3U(String text) {
  final out = <Channel>[];
  final lines = text.split(RegExp(r'\r?\n'));
  final attrRe = RegExp(r'([\w-]+)="([^"]*)"');
  for (var i = 0; i < lines.length; i++) {
    final line = lines[i].trim();
    if (!line.startsWith('#EXTINF:')) continue;
    final attrs = {for (final m in attrRe.allMatches(line)) m[1]!: m[2]!};
    final title = line.replaceAll(RegExp(r'"[^"]*"'), '""').split(',').skip(1).join(',').trim();
    var url = '';
    for (var j = i + 1; j < lines.length; j++) {
      final l = lines[j].trim();
      if (l.isEmpty) continue;
      if (!l.startsWith('#')) url = l;
      break;
    }
    final id = attrs['tvg-id'];
    if (url.isEmpty || id == null || id.isEmpty) continue;
    var name = attrs['tvg-name'] ?? '';
    if (name.isEmpty) name = title.isNotEmpty ? title : id;
    final k = name.indexOf(_sep);
    final game = k == -1 ? name : name.substring(0, k);
    final teams = RegExp(r'^(\S+)\s+@\s+(\S+)$').firstMatch(game);
    out.add(Channel(id: id, name: name, game: game, provider: k == -1 ? 'Main feed' : name.substring(k + _sep.length), url: url, away: teams?[1], home: teams?[2]));
  }
  return out;
}

DateTime? parseXmltvTime(String v) {
  final m = RegExp(r'^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$').firstMatch(v.trim());
  if (m == null) return null;
  final tz = m[7] ?? '+0000';
  final off = (tz[0] == '-' ? -1 : 1) * (int.parse(tz.substring(1, 3)) * 60 + int.parse(tz.substring(3, 5)));
  return DateTime.utc(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!), int.parse(m[4]!), int.parse(m[5]!), int.parse(m[6] ?? '0'))
      .subtract(Duration(minutes: off))
      .toLocal();
}

String _unescape(String s) => s.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');

List<Programme> parseXmltv(String xml) {
  final out = <Programme>[];
  String? tag(String block, String name) {
    final m = RegExp('<$name[^>]*>([\\s\\S]*?)</$name>').firstMatch(block);
    return m == null ? null : _unescape(m[1]!.replaceAll(RegExp(r'\s+'), ' ').trim());
  }
  final soonRe = RegExp(r'\s*\(starting soon\)\s*$', caseSensitive: false);
  for (final m in RegExp(r'<programme\s+([^>]*)>([\s\S]*?)</programme>').allMatches(xml)) {
    final attrs = {for (final a in RegExp(r'([\w-]+)="([^"]*)"').allMatches(m[1]!)) a[1]!: a[2]!};
    final s = parseXmltvTime(attrs['start'] ?? ''), e = parseXmltvTime(attrs['stop'] ?? '');
    var t = tag(m[2]!, 'title');
    final c = attrs['channel'];
    if (c == null || t == null || t.isEmpty || s == null || e == null) continue;
    final soon = soonRe.hasMatch(t);
    if (soon) t = t.replaceAll(soonRe, '');
    out.add(Programme(c: c, s: s, e: e, t: t, d: tag(m[2]!, 'desc'), soon: soon));
  }
  return out;
}
