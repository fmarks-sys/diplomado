import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'session_service.dart';

typedef Recurso = Map<String, dynamic>;

class RecursosService {
  RecursosService({this.client});
  final http.Client? client;

  Future<dynamic> _request(String method, String path, [Recurso? data]) async {
    final headers = await SessionService.headers();
    final connection = client ?? http.Client();
    try {
      final request = http.Request(
        method,
        Uri.parse('${ApiConfig.baseUrl}/$path'),
      );
      request.headers.addAll({...headers, 'Content-Type': 'application/json'});
      if (data != null) request.body = jsonEncode(data);
      final response = await http.Response.fromStream(
        await connection.send(request).timeout(const Duration(seconds: 20)),
      ).timeout(const Duration(seconds: 20));
      dynamic body;
      if (response.body.isNotEmpty) {
        try {
          body = jsonDecode(response.body);
        } catch (_) {
          throw Exception('El servidor devolvió una respuesta inválida.');
        }
      }
      if (response.statusCode == 401) {
        await SessionService.clear();
        throw Exception('La sesión venció. Inicia sesión nuevamente.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(
          body is Map
              ? body['error'] ?? 'No se pudo completar la operación.'
              : 'No se pudo completar la operación.',
        );
      }
      return body;
    } on TimeoutException {
      throw Exception('El servidor tardó demasiado. Intenta nuevamente.');
    } on http.ClientException {
      throw Exception('No se pudo conectar. Revisa tu conexión a internet.');
    } finally {
      if (client == null) connection.close();
    }
  }

  Future<List<Recurso>> list() async =>
      (await _request('GET', 'recursos') as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
  Future<List<Recurso>> areas() async =>
      (await _request('GET', 'areas') as List)
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
  Future<void> save(Recurso data, {int? id}) async {
    await _request(
      id == null ? 'POST' : 'PUT',
      id == null ? 'recursos' : 'recursos/$id',
      data,
    );
  }

  Future<void> setState(int id, String estado) async {
    await _request('PATCH', 'recursos/$id/estado', {'estado': estado});
  }

  Future<void> delete(int id) async {
    await _request('DELETE', 'recursos/$id');
  }
}
