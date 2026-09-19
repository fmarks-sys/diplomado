import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biblioteca_app/config/api_config.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  Map<String, dynamic>? _perfil;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPerfil();
  }

  Future<void> _fetchPerfil() async {
    setState(() => _isLoading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse(ApiConfig.perfil),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _perfil = jsonDecode(response.body);
        });
      } else {
        _mostrarError('Error al cargar perfil');
      }
    } catch (e) {
      _mostrarError('Error de conexión');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _mostrarError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg)),
    );
  }

  Widget _buildItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(
            flex: 3,
            child: Text(value),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = _perfil;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Perfil'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : p == null
              ? const Center(child: Text('No se pudo cargar el perfil'))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 3,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Center(
                            child: Icon(Icons.person, size: 80),
                          ),
                          const SizedBox(height: 16),

                          _buildItem('Nombre:', '${p['nombres']} ${p['apellidos']}'),
                          _buildItem('Correo:', p['correo'] ?? ''),
                          _buildItem('CI:', p['ci'] ?? ''),
                          _buildItem('RU:', p['ru'] ?? 'No registrado'),
                          _buildItem('Tipo:', p['tipo_lector'] ?? ''),
                          _buildItem('Estado:', p['estado'] ?? ''),

                          const SizedBox(height: 10),

                          Chip(
                            label: Text(p['rol'] ?? ''),
                            backgroundColor: Colors.blue.shade100,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }
}