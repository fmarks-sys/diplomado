import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biblioteca_app/config/api_config.dart'; // Ajusta la ruta si es necesario

class HistorialScreen extends StatefulWidget {
  const HistorialScreen({super.key});

  @override
  State<HistorialScreen> createState() => _HistorialScreenState();
}

class _HistorialScreenState extends State<HistorialScreen> {
  List<dynamic> _historial = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistorial();
  }

  Future<void> _fetchHistorial() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse(ApiConfig.misPrestamos),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _historial = jsonDecode(response.body);
        });
      } else {
        _mostrarError('Error al cargar historial: ${response.statusCode}');
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

  // Helper para acortar las fechas que vienen de Postgres (ej: 2026-08-20T00:00:00.000Z -> 2026-08-20)
  String _formatearFecha(String? fechaIso) {
    if (fechaIso == null) return 'N/A';
    if (fechaIso.length >= 10) return fechaIso.substring(0, 10);
    return fechaIso;
  }

  Color _obtenerColorEstado(String estado) {
    switch (estado.toUpperCase()) {
      case 'DEVUELTO':
        return Colors.green;
      case 'VENCIDO':
        return Colors.red;
      case 'PRESTADO':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Historial de Préstamos'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _historial.isEmpty
              ? const Center(child: Text('Aún no tienes préstamos registrados.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12.0),
                  itemCount: _historial.length,
                  itemBuilder: (context, index) {
                    final prestamo = _historial[index];
                    final estado = prestamo['estado'] ?? 'DESCONOCIDO';
                    final colorEstado = _obtenerColorEstado(estado);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: colorEstado.withOpacity(0.5), width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Fila superior: Título y Badge de Estado
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    prestamo['recurso_titulo'] ?? 'Recurso sin título',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: colorEstado.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: colorEstado),
                                  ),
                                  child: Text(
                                    estado,
                                    style: TextStyle(
                                      color: colorEstado,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            // Fila inferior: Fechas
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Fecha Préstamo', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                    Text(_formatearFecha(prestamo['fecha_prestamo']), style: const TextStyle(fontWeight: FontWeight.w500)),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('Devolución Prevista', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                    Text(_formatearFecha(prestamo['fecha_devolucion_prevista']), style: const TextStyle(fontWeight: FontWeight.w500)),
                                  ],
                                ),
                              ],
                            ),
                            if (prestamo['fecha_entrega_real'] != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Entregado el: ${_formatearFecha(prestamo['fecha_entrega_real'])}',
                                style: const TextStyle(fontSize: 13, color: Colors.green, fontStyle: FontStyle.italic),
                              ),
                            ]
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}