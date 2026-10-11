import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:biblioteca_app/main.dart';
import 'package:biblioteca_app/services/auth_service.dart';
import 'package:biblioteca_app/services/session_service.dart';

String jwt(String role, int seconds) {
  final payload = base64Url
      .encode(
        utf8.encode(
          jsonEncode({
            'rol': role,
            'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + seconds,
          }),
        ),
      )
      .replaceAll('=', '');
  return 'header.$payload.signature';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  test('Login sends username and preserves password exactly', () async {
    final token = jwt('BIBLIOTECARIO', 3600);
    final service = AuthService(
      client: MockClient((request) async {
        expect(request.url.path, '/api/auth/login');
        expect(request.url.scheme, 'https');
        expect(jsonDecode(request.body), {
          'username': 'bibliotecario',
          'password': ' clave ',
        });
        return http.Response(
          jsonEncode({
            'token': token,
            'user': {'username': 'bibliotecario', 'rol': 'BIBLIOTECARIO'},
          }),
          200,
        );
      }),
    );
    expect(
      (await service.loginRequest('bibliotecario', ' clave '))['token'],
      token,
    );
  });

  test('Lector is rejected and old session is removed', () async {
    FlutterSecureStorage.setMockInitialValues({
      'jwt': jwt('BIBLIOTECARIO', 3600),
    });
    final service = AuthService(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'token': jwt('LECTOR', 3600),
            'user': {'rol': 'LECTOR'},
          }),
          200,
        ),
      ),
    );
    await expectLater(
      service.loginRequest('lector', 'clave'),
      throwsA(predicate((e) => e.toString().contains('Acceso exclusivo'))),
    );
    expect(await SessionService.readToken(), isNull);
  });

  test('Incorrect credentials show the backend error', () async {
    final service = AuthService(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'error': 'Credenciales incorrectas'}),
          401,
        ),
      ),
    );
    await expectLater(
      service.loginRequest('usuario', 'incorrecta'),
      throwsA(
        predicate((e) => e.toString().contains('Credenciales incorrectas')),
      ),
    );
  });

  test('Non JSON response produces a readable error', () async {
    final service = AuthService(
      client: MockClient(
        (_) async => http.Response('<html>Unavailable</html>', 502),
      ),
    );
    await expectLater(
      service.loginRequest('usuario', 'clave'),
      throwsA(predicate((e) => e.toString().contains('respuesta inválida'))),
    );
  });

  test(
    'JWT is secure, authorized requests use Bearer, logout removes it',
    () async {
      SharedPreferences.setMockInitialValues({
        'token': 'legacy',
        'other': 'keep',
      });
      final token = jwt('BIBLIOTECARIO', 3600);
      await SessionService.save(token, 'bibliotecario');
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('token'), isNull);
      expect(await SessionService.readToken(), token);
      expect(await SessionService.headers(), {
        'Authorization': 'Bearer $token',
      });
      await SessionService.clear();
      expect(await SessionService.readToken(), isNull);
      expect(prefs.getString('other'), 'keep');
    },
  );

  for (final token in [
    jwt('BIBLIOTECARIO', -60),
    jwt('LECTOR', 3600),
    'malformed',
  ]) {
    test(
      'Invalid or expired session cannot authorize a request: $token',
      () async {
        FlutterSecureStorage.setMockInitialValues({'jwt': token});
        expect(await SessionService.readToken(), isNull);
        await expectLater(SessionService.headers(), throwsException);
      },
    );
  }

  testWidgets('App without a session shows librarian login', (tester) async {
    await tester.pumpWidget(const BibliotecaApp());
    await tester.pumpAndSettle();
    expect(find.text('Acceso exclusivo para Bibliotecario'), findsOneWidget);
    expect(find.text('Usuario'), findsOneWidget);
    expect(find.text('Gestionar recursos'), findsNothing);
    await tester.tap(find.text('Ingresar al sistema'));
    await tester.pump();
    expect(find.text('Por favor llena todos los campos'), findsOneWidget);
  });

  testWidgets('Valid session restores dashboard and logout clears navigation', (
    tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({
      'jwt': jwt('BIBLIOTECARIO', 3600),
    });
    SharedPreferences.setMockInitialValues({'nombre_usuario': 'bibliotecario'});
    await tester.pumpWidget(const BibliotecaApp());
    await tester.pumpAndSettle();
    expect(find.text('Gestionar recursos'), findsOneWidget);
    expect(find.text('Mi Historial'), findsNothing);
    await tester.tap(find.byIcon(Icons.logout));
    await tester.pumpAndSettle();
    expect(find.text('Acceso exclusivo para Bibliotecario'), findsOneWidget);
    expect(await SessionService.readToken(), isNull);
    expect(
      Navigator.of(tester.element(find.text('Usuario'))).canPop(),
      isFalse,
    );
  });

  testWidgets('Protected resource route rejects missing session', (
    tester,
  ) async {
    await tester.pumpWidget(const BibliotecaApp());
    await tester.pumpAndSettle();
    Navigator.of(
      tester.element(find.text('Usuario')),
    ).pushNamed('/recursos-crud');
    await tester.pumpAndSettle();
    expect(find.text('Acceso exclusivo para Bibliotecario'), findsWidgets);
    expect(find.text('Nuevo Recurso'), findsNothing);
  });
}
