import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'session_service.dart';

class AuthService {
  AuthService({this.client});
  final http.Client? client;

  Future<Map<String, dynamic>> loginRequest(
    String username,
    String password,
  ) async {
    final requestClient = client ?? http.Client();
    try {
      final response = await requestClient
          .post(
            Uri.parse(ApiConfig.login),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'username': username, 'password': password}),
          )
          .timeout(const Duration(seconds: 20));
      Map<String, dynamic> data;
      try {
        data = jsonDecode(response.body) as Map<String, dynamic>;
      } catch (_) {
        throw Exception('El servidor devolvió una respuesta inválida');
      }
      if (response.statusCode != 200) {
        throw Exception(data['error'] ?? 'Error al iniciar sesión');
      }
      if (data['user'] is! Map || data['user']['rol'] != 'BIBLIOTECARIO') {
        await SessionService.clear();
        throw Exception('Acceso exclusivo para Bibliotecario');
      }
      if (data['token'] is! String || (data['token'] as String).isEmpty) {
        throw Exception('El servidor no devolvió un JWT válido');
      }
      return data;
    } on TimeoutException {
      throw Exception('El servidor tardó demasiado. Intenta nuevamente.');
    } on http.ClientException {
      throw Exception('No se pudo conectar. Revisa tu conexión a internet.');
    } finally {
      if (client == null) requestClient.close();
    }
  }
}
