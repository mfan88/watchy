import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';

/// Sign in with a Watchy account; the server hands back the stream key.
class SetupScreen extends StatefulWidget {
  final Api api;
  final String? error;
  final VoidCallback onDone;
  const SetupScreen({super.key, required this.api, required this.onDone, this.error});
  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  late final _user = TextEditingController(text: widget.api.username);
  final _pass = TextEditingController();
  late String? _error = (widget.error?.isEmpty ?? true) ? null : widget.error;
  bool _busy = false;

  Future<void> _go() async {
    if (_user.text.trim().isEmpty || _pass.text.isEmpty) return setState(() => _error = 'Enter your username and password.');
    setState(() { _busy = true; _error = null; });
    try {
      await widget.api.login(_user.text.trim(), _pass.text);
      widget.onDone();
    } on ApiException catch (e) {
      setState(() { _busy = false; _error = e.message; });
    }
  }

  InputDecoration _deco(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: C.bg,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.stroke)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.stroke)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: C.accent, width: 2)),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Container(
            width: 460,
            padding: const EdgeInsets.fromLTRB(40, 40, 40, 36),
            decoration: BoxDecoration(color: C.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: C.stroke)),
            child: AutofillGroup(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Wordmark(size: 44),
                const SizedBox(height: 10),
                const Text('Sign in with your Watchy account', style: TextStyle(color: C.dim, fontSize: 14), textAlign: TextAlign.center),
                const SizedBox(height: 28),
                TextField(controller: _user, autofocus: widget.api.username.isEmpty, textInputAction: TextInputAction.next, autofillHints: const [AutofillHints.username], style: const TextStyle(fontSize: 16), decoration: _deco('Username')),
                const SizedBox(height: 12),
                TextField(controller: _pass, autofocus: widget.api.username.isNotEmpty, obscureText: true, onSubmitted: (_) => _go(), autofillHints: const [AutofillHints.password], style: const TextStyle(fontSize: 16), decoration: _deco('Password')),
                SizedBox(height: 34, child: Center(child: Text(_error ?? '', style: const TextStyle(color: C.live, fontSize: 13)))),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: FilledButton(
                    onPressed: _busy ? null : _go,
                    style: FilledButton.styleFrom(backgroundColor: C.accent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: Text(_busy ? 'Signing in…' : 'Sign in', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: C.text)),
                  ),
                ),
              ]),
            ),
          ),
        ),
      );
}
