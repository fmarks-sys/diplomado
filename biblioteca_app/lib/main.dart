import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/recursos_screen.dart';
import 'screens/recursos_crud_screen.dart';
import 'screens/session_gate.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BibliotecaApp());
}

class BibliotecaApp extends StatelessWidget {
  const BibliotecaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Biblioteca',
      theme: AppTheme.light,
      home: const SessionGate(child: DashboardScreen()),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/dashboard': (_) => const SessionGate(child: DashboardScreen()),
        '/recursos': (_) => const SessionGate(child: RecursosScreen()),
        '/recursos-crud': (_) => const SessionGate(child: RecursosCRUDScreen()),
      },
    );
  }
}
