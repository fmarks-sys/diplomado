import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biblioteca_app/config/api_config.dart';

class RecursosCRUDScreen extends StatefulWidget {
  const RecursosCRUDScreen({super.key});

  @override
  State<RecursosCRUDScreen> createState() => _RecursosCRUDScreenState();
}

class _RecursosCRUDScreenState extends State<RecursosCRUDScreen> {
  List<dynamic> _recursos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchRecursos();
  }

  Future<void> _fetchRecursos() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse(ApiConfig.recursos),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        setState(() => _recursos = jsonDecode(response.body));
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _eliminarRecurso(int id) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar'),
        content: const Text('¿Seguro que deseas eliminar este recurso?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      await http.delete(
        Uri.parse('${ApiConfig.recursos}/$id'),
        headers: {'Authorization': 'Bearer $token'},
      );
      _fetchRecursos();
    }
  }

 // 🚀 FORMULARIO INTEGRADO (Modal Bottom Sheet)
  void _mostrarFormularioModal() {
    final codigoController = TextEditingController();
    final tituloController = TextEditingController();
    final autorController = TextEditingController(); // 👈 NUEVO CAMPO DE AUTOR
    final stockController = TextEditingController();
    String tipoRecurso = 'LIBRO';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16, right: 16, top: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Crear Recurso', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: codigoController,
                decoration: const InputDecoration(labelText: 'Código Topográfico', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: tituloController,
                decoration: const InputDecoration(labelText: 'Título', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              // 👇 CAMPO DE TEXTO PARA EL AUTOR
              TextField(
                controller: autorController,
                decoration: const InputDecoration(labelText: 'Autor (Obligatorio)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: stockController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Stock Inicial', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: tipoRecurso,
                decoration: const InputDecoration(labelText: 'Tipo', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'LIBRO', child: Text('LIBRO')),
                  DropdownMenuItem(value: 'TESIS', child: Text('TESIS')),
                ],
                onChanged: (val) => tipoRecurso = val!,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    // Validar campos mínimos para que Flutter no mande errores si envían vacío
                    if (codigoController.text.isEmpty || tituloController.text.isEmpty || autorController.text.isEmpty || stockController.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Llena todos los campos'), backgroundColor: Colors.red));
                      return;
                    }

                    final prefs = await SharedPreferences.getInstance();
                    final token = prefs.getString('token') ?? '';
                    
                    final body = {
                      "codigo_topografico": codigoController.text,
                      "titulo": tituloController.text,
                      "anio_publicacion": 2026, 
                      "area_id": 1, 
                      "tipo_recurso": tipoRecurso,
                      "cantidad_total": int.parse(stockController.text),
                      
                      // 🔥 CAMPOS REQUERIDOS POR TU BACKEND:
                      "autor": autorController.text, // Para Libros
                      
                      // Datos por defecto para que no explote si eligen Tesis
                      "autor_postulante": autorController.text,
                      "tutor_guia": "Asignado por Sistema",
                      "gestion_defensa": "2026",
                    };

                    final response = await http.post(
                      Uri.parse(ApiConfig.recursos),
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer $token',
                      },
                      body: jsonEncode(body),
                    );

                    if (context.mounted) {
                      if (response.statusCode == 201 || response.statusCode == 200) {
                        Navigator.pop(context); // Cierra el modal
                        _fetchRecursos(); // Recarga la tabla
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Guardado'), backgroundColor: Colors.green));
                      } else {
                        // Muestra el error exacto de tu backend
                        final errorData = jsonDecode(response.body);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${errorData['error']}'), backgroundColor: Colors.red));
                      }
                    }
                  },
                  child: const Text('Guardar'),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CRUD Recursos (Admin)')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: _recursos.length,
              itemBuilder: (context, index) {
                final r = _recursos[index];
                return ListTile(
                  leading: const Icon(Icons.book),
                  title: Text(r['titulo']),
                  subtitle: Text('Stock: ${r['cantidad_disponible']}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    onPressed: () => _eliminarRecurso(r['id']),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _mostrarFormularioModal, // Llama al formulario interno
        child: const Icon(Icons.add),
      ),
    );
  }
}