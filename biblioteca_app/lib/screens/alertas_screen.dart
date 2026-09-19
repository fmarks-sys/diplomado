import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biblioteca_app/config/api_config.dart'; // Ajusta la ruta si es necesario

class AlertasScreen extends StatefulWidget {
  const AlertasScreen({super.key});

  @override
  State<AlertasScreen> createState() => _AlertasScreenState();
}

class _AlertasScreenState extends State<AlertasScreen> {
  List<dynamic> _alertas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAlertas();
  }

  Future<void> _fetchAlertas() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse(ApiConfig.misAlertas), // Endpoint configurado previamente
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _alertas = jsonDecode(response.body);
        });
      } else {
        _mostrarError('Error al cargar alertas: ${response.statusCode}');
      }
    } catch (e) {
      _mostrarError('Error de conexión al servidor.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _mostrarError(String mensaje) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  String _formatearFecha(String? fechaIso) {
    if (fechaIso == null) return 'N/A';
    if (fechaIso.length >= 10) return fechaIso.substring(0, 10);
    return fechaIso;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Alertas'),
        backgroundColor: Colors.redAccent, // Color distintivo para alertas
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _alertas.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_outline, size: 80, color: Colors.green.shade300),
                      const SizedBox(height: 16),
                      const Text(
                        '¡Todo al día!',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const Text('No tienes devoluciones pendientes.'),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12.0),
                  itemCount: _alertas.length,
                  itemBuilder: (context, index) {
                    final alerta = _alertas[index];
                    final estado = alerta['estado'] ?? 'DESCONOCIDO';
                    final esVencido = estado == 'VENCIDO';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: esVencido ? Colors.red : Colors.orange,
                          width: 2,
                        ),
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: esVencido ? Colors.red.shade100 : Colors.orange.shade100,
                          child: Icon(
                            esVencido ? Icons.warning_rounded : Icons.access_time_rounded,
                            color: esVencido ? Colors.red : Colors.orange,
                          ),
                        ),
                        title: Text(
                          alerta['recurso_titulo'] ?? 'Recurso sin título',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(
                              esVencido
                                  ? '¡Préstamo Vencido!'
                                  : 'Vence pronto',
                              style: TextStyle(
                                color: esVencido ? Colors.red : Colors.orange.shade800,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Devolución prevista: ${_formatearFecha(alerta['fecha_devolucion_prevista'])}',
                            ),
                          ],
                        ),
                        isThreeLine: true,
                      ),
                    );
                  },
                ),
    );
  }
}