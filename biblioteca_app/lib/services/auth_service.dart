import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:biblioteca_app/config/api_config.dart'; // Importa tu configuración dinámica

class AuthService {
  Future<Map<String, dynamic>> loginRequest(String correo, String password) async {
    // Usamos ApiConfig.login en lugar de la variable estática
    final response = await http.post(
      Uri.parse(ApiConfig.login),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'correo': correo, 
        'password': password,
      }),
    );

    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Error al iniciar sesión');
    }

    return jsonDecode(response.body);
  }
}
