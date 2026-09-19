import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart'; // Asegúrate de importar tu Login


class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _nombreUsuario = 'Cargando...';

  String _rol = '';

  @override
  void initState() {
    super.initState();
    _cargarDatosUsuario();
  }

  Future<void> _cargarDatosUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      // Lee el nombre que guardaste en el login, si no existe usa 'Usuario'
      _nombreUsuario = prefs.getString('nombre_usuario') ?? 'Usuario';
      _rol = prefs.getString('rol') ?? ''; // 2. ASIGNA EL VALOR AQUÍ
    });
  }

  Future<void> _cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear(); // Borra el token y todos los datos guardados

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tiles = [
      // Buscar libros y tesis
      //{'icon': Icons.search, 'label': 'Buscar Recursos', 'route': '/recursos'},
      // 🔥 CONDICIONAL: Solo el ADMIN ve el CRUD
      if (_rol == 'ADMIN') 
        {'icon': Icons.settings, 'label': 'Gestionar Recursos', 'route': '/recursos-crud'}
      else 
        {'icon': Icons.search, 'label': 'Buscar Recursos', 'route': '/recursos'},

      // Ver lo que el usuario ya leyó o tiene prestado
      {'icon': Icons.history, 'label': 'Mi Historial', 'route': '/historial'},

      // Avisos de fechas de entrega próximas o vencidas
      {
        'icon': Icons.notifications_active,
        'label': 'Mis Alertas',
        'route': '/alertas',
      },

      // Cambiado: El lector ve su perfil, no la lista de usuarios
      {'icon': Icons.person, 'label': 'Mi Perfil', 'route': '/perfil'},
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Biblioteca Ing. Informática'),
        actions: [
          // Botón de Logout completado
          IconButton(
            onPressed: _cerrarSesion,
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: BorderRadius.circular(12),
              ),
              // Muestra el nombre dinámicamente
              child: Text(
                'Bienvenido, $_nombreUsuario',
                style: const TextStyle(color: Colors.white, fontSize: 18),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
              ),
              delegate: SliverChildBuilderDelegate((context, i) {
                final t = tiles[i];
                return GestureDetector(
                  onTap: () {
                    // Solo navega si la ruta está definida en el MaterialApp
                    if (t['route'] != null) {
                      Navigator.pushNamed(context, t['route'] as String);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          t['icon'] as IconData,
                          size: 30,
                          color: Theme.of(context).primaryColor,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          t['label'] as String,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                );
              }, childCount: tiles.length),
            ),
          ),
        ],
      ),
    );
  }
}
