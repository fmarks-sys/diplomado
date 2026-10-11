import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'session_service.dart';

typedef DashboardItem = Map<String, dynamic>;

class DashboardData {
  const DashboardData({
    required this.resources,
    required this.loans,
    required this.readers,
  });
  final List<DashboardItem> resources;
  final List<DashboardItem> loans;
  final List<DashboardItem> readers;
  int get activeLoans => loans
      .where((item) => ['PRESTADO', 'VENCIDO'].contains(item['estado']))
      .length;
  int get overdueLoans =>
      loans.where((item) => item['estado'] == 'VENCIDO').length;
}

class DashboardService {
  DashboardService({this.client});
  final http.Client? client;

  Future<DashboardData> load() async {
    final headers = await SessionService.headers();
    final requestClient = client ?? http.Client();
    try {
      final responses = await Future.wait([
        for (final path in ['recursos', 'prestamos', 'lectores'])
          requestClient
              .get(Uri.parse('${ApiConfig.baseUrl}/$path'), headers: headers)
              .timeout(const Duration(seconds: 20)),
      ]);
      if (responses.any((response) => response.statusCode == 401)) {
        await SessionService.clear();
        throw Exception('La sesión venció. Inicia sesión nuevamente.');
      }
      final lists = responses.map((response) {
        if (response.statusCode != 200) {
          throw Exception('No se pudo cargar el resumen de la biblioteca.');
        }
        final data = jsonDecode(response.body);
        if (data is! List) throw Exception('Respuesta inválida del servidor.');
        return data
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
      }).toList();
      return DashboardData(
        resources: lists[0],
        loans: lists[1],
        readers: lists[2],
      );
    } finally {
      if (client == null) requestClient.close();
    }
  }
}
