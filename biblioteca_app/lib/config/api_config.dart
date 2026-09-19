import 'package:flutter/foundation.dart';

class ApiConfig {
  // 1. Base URL general apuntando solo hasta "/api"
  static String get baseUrl {
    if (kIsWeb) {
      return "http://localhost:3000/api";
    } else {
      //  IMPORTANTE: Reemplaza las XX con tu IP real, ej: 192.168.1.15
      return "http://192.168.1.XX:3000/api";
      //return "http://192.168.137";
    }
  }

  // 2. Endpoints de Autenticación
  static String get login => "$baseUrl/auth/login";

  // 3. Endpoints de Recursos (para tu pantalla de búsqueda)
  static String get recursos => "$baseUrl/recursos";

  // 4. Endpoints de Préstamos (Rutas de Lector)
  static String get misPrestamos => "$baseUrl/prestamos/mis-prestamos";
  static String get misAlertas => "$baseUrl/prestamos/mis-alertas";
  
  //5. perfil usuario de sistema
  static String get perfil => "$baseUrl/lectores/mi-perfil";
    
}