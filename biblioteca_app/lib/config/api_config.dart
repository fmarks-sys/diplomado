class ApiConfig {
  static const _url = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://diplomado-production-40c1.up.railway.app',
  );

  static String get baseUrl {
    final url = _url.replaceFirst(RegExp(r'/+$'), '');
    return url.endsWith('/api') ? url : '$url/api';
  }

  static String get login => '$baseUrl/auth/login';
  static String get recursos => '$baseUrl/recursos';
  static String get misPrestamos => '$baseUrl/prestamos/mis-prestamos';
  static String get misAlertas => '$baseUrl/prestamos/mis-alertas';
  static String get perfil => '$baseUrl/lectores/mi-perfil';
}
