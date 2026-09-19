import 'package:flutter/material.dart';
import 'package:biblioteca_app/screens/login_screen.dart';
import 'package:biblioteca_app/screens/dashboard_screen.dart';
import 'package:biblioteca_app/screens/recursos_screen.dart';
import 'package:biblioteca_app/screens/historial_screen.dart';
import 'package:biblioteca_app/screens/alertas_screen.dart';
import 'package:biblioteca_app/screens/perfil_screen.dart';
import 'package:biblioteca_app/screens/recursos_crud_screen.dart';

void main() {
  runApp(const BibliotecaApp());
}

class BibliotecaApp extends StatelessWidget {
  const BibliotecaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Mi App Biblioteca',
      home: const LoginScreen(),
      routes: {
        '/dashboard': (context) => const DashboardScreen(),
        '/recursos': (context) => const RecursosScreen(),
        '/recursos-crud': (context) => const RecursosCRUDScreen(), // 👈 Nueva ruta
        '/historial': (context) => const HistorialScreen(),
        '/alertas': (context) => const AlertasScreen(),
        '/perfil': (context) => const PerfilScreen(), // La agregaremos luego

      },
    );
  }
}