import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';

/// Only shown when the app was built without the key: asks for it once.
class SetupScreen extends StatefulWidget {
  final Api api;
  final String? error;
  final VoidCallback onDone;
  const SetupScreen({super.key, required this.api, required this.onDone, this.error});
  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _key = TextEditingController();
  late String? _error = (widget.error?.isEmpty ?? true) ? null : widget.error;
  bool _busy = false;

  Future<void> _go() async {
    final v = _key.text.trim();
    if (v.isEmpty) return setState(() => _error = 'Enter the access key.');
    setState(() { _busy = true; _error = null; });
    widget.api.secret = v;
    try {
      await widget.api.channels();
      widget.onDone();
    } on ApiException catch (e) {
      widget.api.forget();
      setState(() { _busy = false; _error = e.message; });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Container(
            width: 460,
            padding: const EdgeInsets.fromLTRB(40, 40, 40, 36),
            decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: C.stroke)),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Wordmark(size: 44),
              const SizedBox(height: 10),
              const Text('Enter the stream server access key (HTV_SECRET)', style: TextStyle(color: C.dim, fontSize: 14), textAlign: TextAlign.center),
              const SizedBox(height: 28),
              TextField(
                controller: _key,
                autofocus: true,
                onSubmitted: (_) => _go(),
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Access key',
                  filled: true,
                  fillColor: C.bg,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.stroke)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.stroke)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.accent, width: 2)),
                ),
              ),
              SizedBox(height: 34, child: Center(child: Text(_error ?? '', style: const TextStyle(color: C.live, fontSize: 13)))),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton(
                  onPressed: _busy ? null : _go,
                  style: FilledButton.styleFrom(backgroundColor: C.accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  child: Text(_busy ? 'Checking…' : 'Continue', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: C.text)),
                ),
              ),
            ]),
          ),
        ),
      );
}
