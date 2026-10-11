import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionService {
  static const _storage = FlutterSecureStorage();

  // Navigation check only: the API verifies the JWT signature and permissions.
  static DateTime? expiration(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
      );
      if (payload is! Map ||
          payload['rol'] != 'BIBLIOTECARIO' ||
          payload['exp'] is! num) {
        return null;
      }
      return DateTime.fromMillisecondsSinceEpoch(
        (payload['exp'] as num).toInt() * 1000,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<String?> readToken() async {
    final token = await _storage.read(key: 'jwt');
    final expires = token == null ? null : expiration(token);
    if (expires == null || !expires.isAfter(DateTime.now())) {
      await clear();
      return null;
    }
    return token;
  }

  static Future<void> save(String token, String username) async {
    final expires = expiration(token);
    if (expires == null || !expires.isAfter(DateTime.now())) {
      throw Exception('La sesión recibida no es válida');
    }
    await clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('nombre_usuario', username);
    await prefs.setString('rol', 'BIBLIOTECARIO');
    await _storage.write(key: 'jwt', value: token);
  }

  static Future<void> clear() async {
    await _storage.delete(key: 'jwt');
    final prefs = await SharedPreferences.getInstance();
    for (final key in ['token', 'nombre_usuario', 'rol']) {
      await prefs.remove(key);
    }
  }

  static Future<Map<String, String>> headers() async {
    final token = await readToken();
    if (token == null) {
      throw Exception('Sesión vencida. Inicia sesión nuevamente.');
    }
    return {'Authorization': 'Bearer $token'};
  }
}
