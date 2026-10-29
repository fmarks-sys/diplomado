import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'session_service.dart';

typedef Recurso = Map<String, dynamic>;

class RecursosService {
  RecursosService({this.client});
  final http.Client? client;

  Future<dynamic> _request(
    String method,
    String path, [
    Recurso? data,
    Duration timeout = const Duration(seconds: 20),
  ]) async {
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
        await connection.send(request).timeout(timeout),
      ).timeout(timeout);
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

  static const maxImageBytes = 3 * 1024 * 1024;

  Future<Recurso> scan(Uint8List bytes) async {
    if (bytes.length > maxImageBytes) {
      throw Exception(
        'La foto supera 3 MiB. Toma otra foto o selecciona una imagen más pequeña.',
      );
    }
    String? mime;
    if (bytes.length >= 4 &&
        bytes[0] == 255 &&
        bytes[1] == 216 &&
        bytes[2] == 255) {
      mime = 'image/jpeg';
    } else if (bytes.length >= 24 &&
        base64Encode(bytes.sublist(0, 8)) == 'iVBORw0KGgo=') {
      mime = 'image/png';
    } else if (bytes.length >= 12 &&
        ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP') {
      mime = 'image/webp';
    }
    if (mime == null) {
      throw Exception('Selecciona una imagen JPEG, PNG o WebP.');
    }
    final result = await _request('POST', 'recursos/escanear', {
      'mime_type': mime,
      'imagen_base64': base64Encode(bytes),
    }, const Duration(seconds: 50));
    if (result is! Map || result['data'] is! Map) {
      throw Exception(
        'El escáner devolvió una respuesta inválida. Puedes completar los datos manualmente.',
      );
    }
    final data = <String, dynamic>{};
    for (final key in ['titulo', 'autor', 'anio_publicacion', 'isbn']) {
      final value = result['data'][key];
      if (value != null &&
          (key == 'anio_publicacion' ? value is! int : value is! String)) {
        throw Exception(
          'El escáner devolvió datos inválidos. Puedes completar los datos manualmente.',
        );
      }
      data[key] = value;
    }
    return data;
  }
}
