import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biblioteca_app/config/api_config.dart'; // Asegúrate de que la ruta coincida con la ubicación de tu archivo

class RecursosScreen extends StatefulWidget {
  const RecursosScreen({super.key});

  @override
  State<RecursosScreen> createState() => _RecursosScreenState();
}

class _RecursosScreenState extends State<RecursosScreen> {
  List<dynamic> _recursos = [];
  List<dynamic> _recursosFiltrados = [];
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchRecursos();
    _searchController.addListener(_filtrarRecursos);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchRecursos() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse(ApiConfig.recursos), // Usas tu endpoint dinámico
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _recursos = data; // Ajusta 'data' si tu API devuelve un objeto { data: [...] }
          _recursosFiltrados = data;
        });
      } else {
        _mostrarError('Error al cargar recursos: ${response.statusCode}');
      }
    } catch (e) {
      _mostrarError('Error de conexión al servidor.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _filtrarRecursos() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _recursosFiltrados = _recursos.where((recurso) {
        final titulo = recurso['titulo'].toString().toLowerCase();
        final codigo = recurso['codigo_topografico'].toString().toLowerCase();
        return titulo.contains(query) || codigo.contains(query);
      }).toList();
    });
  }

  void _mostrarError(String mensaje) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Buscar Recursos'),
      ),
      body: Column(
        children: [
          // Barra de Búsqueda
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar por título o código...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
            ),
          ),
          
          // Lista de Recursos
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _recursosFiltrados.isEmpty
                    ? const Center(child: Text('No se encontraron recursos.'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        itemCount: _recursosFiltrados.length,
                        itemBuilder: (context, index) {
                          final recurso = _recursosFiltrados[index];
                          final isLibro = recurso['tipo_recurso'] == 'LIBRO';
                          final disponible = recurso['cantidad_disponible'] > 0;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isLibro ? Colors.blue.shade100 : Colors.green.shade100,
                                child: Icon(
                                  isLibro ? Icons.book : Icons.school,
                                  color: isLibro ? Colors.blue : Colors.green,
                                ),
                              ),
                              title: Text(
                                recurso['titulo'] ?? 'Sin título',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text('Código: ${recurso['codigo_topografico']}'),
                                  Text(
                                    disponible 
                                      ? 'Disponibles: ${recurso['cantidad_disponible']}' 
                                      : 'Agotado',
                                    style: TextStyle(
                                      color: disponible ? Colors.green.shade700 : Colors.red,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                              isThreeLine: true,
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                // Aquí puedes navegar a un detalle del recurso más adelante
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}