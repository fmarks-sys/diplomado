import 'dart:async';
import 'package:flutter/material.dart';
import '../services/session_service.dart';
import 'login_screen.dart';

class SessionGate extends StatefulWidget {
  const SessionGate({super.key, required this.child});
  final Widget child;

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  late final Future<String?> _session;
  Timer? _expiryTimer;

  @override
  void initState() {
    super.initState();
    _session = _loadSession();
  }

  Future<String?> _loadSession() async {
    final token = await SessionService.readToken();
    if (token != null && mounted) {
      final expires = SessionService.expiration(token)!;
      _expiryTimer = Timer(expires.difference(DateTime.now()), () async {
        await SessionService.clear();
        if (mounted) {
          Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
        }
      });
    }
    return token;
  }

  @override
  void dispose() {
    _expiryTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: _session,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasError || snapshot.data == null) {
          return const LoginScreen();
        }
        return widget.child;
      },
    );
  }
}
