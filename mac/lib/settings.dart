import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'streams.dart';
import 'ui.dart';

/// Settings → Playback → Stream format (Auto / fMP4 / MPEG-TS). Saved on this device.
Future<void> showSettings(BuildContext context, SharedPreferences prefs) => showDialog(
      context: context,
      builder: (_) => StatefulBuilder(builder: (context, setState) {
        final cur = Streams.setting(prefs);
        return AlertDialog(
          backgroundColor: C.surface,
          title: const Text('Settings', style: TextStyle(fontFamily: titleFont, fontSize: 22, fontWeight: FontWeight.w600)),
          content: SizedBox(
            width: 460,
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('PLAYBACK', style: TextStyle(color: C.faint, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
              const SizedBox(height: 12),
              const Text('Stream format', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              SegmentedButton<StreamFormat>(
                showSelectedIcon: false,
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: C.accent,
                  selectedForegroundColor: C.text,
                  foregroundColor: C.dim,
                  side: const BorderSide(color: C.stroke),
                ),
                segments: [for (final f in StreamFormat.values) ButtonSegment(value: f, label: Text(f.label))],
                selected: {cur},
                onSelectionChanged: (s) async {
                  await Streams.setSetting(prefs, s.first);
                  setState(() {});
                },
              ),
              const SizedBox(height: 10),
              Text(cur.hint, style: const TextStyle(color: C.dim, fontSize: 13)),
            ]),
          ),
          actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done'))],
        );
      }),
    );
