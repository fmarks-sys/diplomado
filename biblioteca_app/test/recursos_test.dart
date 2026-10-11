import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:biblioteca_app/screens/login_screen.dart';
import 'package:biblioteca_app/screens/recursos_crud_screen.dart';
import 'package:biblioteca_app/screens/recurso_form_screen.dart';
import 'package:biblioteca_app/services/recursos_service.dart';
import 'package:biblioteca_app/theme/app_theme.dart';
import 'widget_test.dart' show jwt;

class FakeCatalog {
  final rows = List.generate(
    27,
    (i) => <String, dynamic>{
      'id': i + 1,
      'titulo': 'Libro ${i + 1}',
      'codigo_topografico': 'INF-${i + 1}',
      'tipo_recurso': 'LIBRO',
      'autor': 'Autor ${i + 1}',
      'anio_publicacion': 2025,
      'area_id': 7,
      'area_nombre': 'Informática',
      'cantidad_total': 4,
      'cantidad_disponible': 3,
      'estado': 'DISPONIBLE',
      'palabras_clave': ['SISTEMAS'],
    },
  );
  final writes = <http.Request>[];
  late final service = RecursosService(
    client: MockClient((request) async {
      expect(request.headers['Authorization'], startsWith('Bearer '));
      final path = request.url.path;
      if (request.method == 'GET') {
        return reply(
          path.endsWith('/areas')
              ? [
                  {'id': 7, 'nombre': 'Informática', 'estado': 'ACTIVO'},
                ]
              : rows,
        );
      }
      writes.add(request);
      if (request.method == 'POST') {
        final body = jsonDecode(request.body) as Map<String, dynamic>;
        rows.insert(0, {
          ...body,
          'id': 99,
          'cantidad_disponible': body['cantidad_total'],
          'estado': 'DISPONIBLE',
        });
        return reply(rows.first, 201);
      }
      if (request.method == 'PUT') {
        final index = rows.indexWhere(
          (row) => row['id'].toString() == path.split('/').last,
        );
        rows[index] = {
          ...rows[index],
          ...jsonDecode(request.body) as Map<String, dynamic>,
        };
        return reply(rows[index]);
      }
      if (request.method == 'PATCH') {
        final id = int.parse(path.split('/')[3]);
        final row = rows.firstWhere((row) => row['id'] == id);
        row['estado'] = jsonDecode(request.body)['estado'];
        return reply(row);
      }
      return reply({
        'error': 'No se puede eliminar un recurso con préstamos asociados',
      }, 409);
    }),
  );
  http.Response reply(Object body, [int status = 200]) => http.Response(
    jsonEncode(body),
    status,
    headers: {'content-type': 'application/json; charset=utf-8'},
  );
}

Future<void> mount(WidgetTester tester, Widget screen) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: RepaintBoundary(key: const Key('preview'), child: screen),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> preview(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('WRITE_PREVIEW')) return;
  await tester.runAsync(() async {
    final image = await tester
        .renderObject<RenderRepaintBoundary>(find.byKey(const Key('preview')))
        .toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await File('design/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

Future<void> field(WidgetTester tester, String key, String value) async {
  final finder = find.byKey(ValueKey(key));
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.enterText(finder, value);
}

Future<void> save(WidgetTester tester) async {
  await tester.ensureVisible(find.text('Guardar recurso'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Guardar recurso'));
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    for (final entry in {
      'Inter': 'assets/fonts/Inter.ttf',
      'MaterialIcons': 'fonts/MaterialIcons-Regular.otf',
    }.entries) {
      final loader = FontLoader(entry.key)
        ..addFont(rootBundle.load(entry.value));
      await loader.load();
    }
  });
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({
      'jwt': jwt('BIBLIOTECARIO', 3600),
    });
  });

  testWidgets('Login follows reference and password visibility works', (
    tester,
  ) async {
    await mount(tester, const LoginScreen());
    expect(tester.takeException(), isNull);
    await preview(tester, 'login-preview');
    final password = find.byType(TextField).last;
    expect(tester.widget<TextField>(password).obscureText, isTrue);
    await tester.tap(find.byTooltip('Mostrar contraseña'));
    await tester.pump();
    expect(tester.widget<TextField>(password).obscureText, isFalse);
    await tester.tap(find.text('¿Olvidó su contraseña?'));
    await tester.pumpAndSettle();
    expect(find.text('Recuperar acceso'), findsOneWidget);
  });

  testWidgets('Catalog pages and search resets the page', (tester) async {
    final api = FakeCatalog();
    await mount(tester, RecursosCRUDScreen(service: api.service));
    expect(find.text('Página 1 de 3'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await preview(tester, 'recursos-preview');
    await tester.tap(find.byTooltip('Página siguiente'));
    await tester.pumpAndSettle();
    expect(find.text('Página 2 de 3'), findsOneWidget);
    expect(find.text('Libro 11'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Libro 27');
    await tester.pumpAndSettle();
    expect(find.text('Página 1 de 1'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(ListTile),
        matching: find.text('Libro 27'),
      ),
      findsOneWidget,
    );
  });

  testWidgets(
    'Book create includes optional bibliographic fields without invented area or year',
    (tester) async {
      final api = FakeCatalog();
      await mount(tester, RecursosCRUDScreen(service: api.service));
      await tester.tap(find.text('Agregar'));
      await tester.pumpAndSettle();
      await field(tester, 'codigo_topografico', 'NEW-01');
      await field(tester, 'titulo', 'Nuevo libro');
      await field(tester, 'anio_publicacion', '2024');
      await field(tester, 'autor', 'María Pérez');
      await field(tester, 'isbn', '9780000000001');
      await field(tester, 'editorial', 'Editorial Académica');
      await field(tester, 'edicion', 'Segunda');
      await field(tester, 'cantidad_total', '1.5');
      await save(tester);
      expect(api.writes, isEmpty);
      expect(find.text('Ingresa un entero mayor o igual a 1'), findsOneWidget);
      await field(tester, 'cantidad_total', '5');
      await save(tester);
      expect(api.writes.single.method, 'POST');
      final body = jsonDecode(api.writes.single.body);
      expect(body['anio_publicacion'], 2024);
      expect(body['area_id'], isNull);
      expect(body['cantidad_total'], 5);
      expect(body['isbn'], '9780000000001');
      expect(body.containsKey('tutor_guia'), isFalse);
      expect(find.text('Recurso guardado'), findsOneWidget);
      expect(find.text('Nuevo libro'), findsOneWidget);
    },
  );

  testWidgets(
    'Thesis form requires its own fields and sends jurors and keywords as arrays',
    (tester) async {
      final api = FakeCatalog();
      await mount(tester, RecursosCRUDScreen(service: api.service));
      await tester.tap(find.text('Agregar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tesis'));
      await tester.pumpAndSettle();
      await field(tester, 'codigo_topografico', 'TES-01');
      await field(tester, 'titulo', 'Una tesis');
      await field(tester, 'anio_publicacion', '2023');
      await save(tester);
      expect(api.writes, isEmpty);
      expect(find.text('Este campo es obligatorio'), findsNWidgets(3));
      await field(tester, 'autor_postulante', 'Ana');
      await field(tester, 'tutor_guia', 'Luis');
      await field(tester, 'gestion_defensa', '2023');
      await field(tester, 'tribunal_jurado', 'Jurado Uno, Jurado Dos');
      await field(tester, 'url_documento_pdf', 'https://example.com/tesis.pdf');
      await field(tester, 'palabras_clave', 'Redes, Seguridad');
      await save(tester);
      final body = jsonDecode(api.writes.single.body);
      expect(body['tipo_recurso'], 'TESIS');
      expect(body['cantidad_total'], 1);
      expect(body['tribunal_jurado'], ['Jurado Uno', 'Jurado Dos']);
      expect(body['palabras_clave'], ['Redes', 'Seguridad']);
      expect(body.containsKey('autor'), isFalse);
      expect(find.text('Recurso guardado'), findsOneWidget);
    },
  );

  testWidgets('Existing book is prefilled and edit uses PUT', (tester) async {
    final api = FakeCatalog();
    await mount(tester, RecursosCRUDScreen(service: api.service));
    await tester.tap(find.byTooltip('Opciones del recurso').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Editar'));
    await tester.pumpAndSettle();
    expect(find.byType(RecursoFormScreen), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.byKey(const ValueKey('titulo')))
          .controller!
          .text,
      'Libro 1',
    );
    await field(tester, 'titulo', 'Libro actualizado');
    await save(tester);
    expect(api.writes.single.method, 'PUT');
    expect(api.writes.single.url.path, '/api/recursos/1');
    expect(jsonDecode(api.writes.single.body)['area_id'], 7);
    expect(find.text('Libro actualizado'), findsOneWidget);
  });

  testWidgets('Changing resource state uses PATCH and refreshes the catalog', (
    tester,
  ) async {
    final api = FakeCatalog();
    await mount(tester, RecursosCRUDScreen(service: api.service));
    await tester.tap(find.byTooltip('Opciones del recurso').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cambiar estado'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.byType(DropdownButtonFormField<String>),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mantenimiento').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Aplicar'));
    await tester.pumpAndSettle();
    expect(api.writes.single.method, 'PATCH');
    expect(api.writes.single.url.path, '/api/recursos/1/estado');
    expect(jsonDecode(api.writes.single.body), {'estado': 'MANTENIMIENTO'});
    expect(find.text('Mantenimiento'), findsOneWidget);
    expect(find.text('Estado actualizado'), findsOneWidget);
  });

  testWidgets(
    'Delete conflict keeps the resource and shows the server message',
    (tester) async {
      final api = FakeCatalog();
      await mount(tester, RecursosCRUDScreen(service: api.service));
      await tester.tap(find.byTooltip('Opciones del recurso').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Eliminar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Eliminar definitivamente'));
      await tester.pumpAndSettle();
      expect(api.writes.single.method, 'DELETE');
      expect(
        find.text('No se puede eliminar un recurso con préstamos asociados'),
        findsOneWidget,
      );
      expect(find.text('Libro 1'), findsOneWidget);
      expect(find.text('Recurso eliminado'), findsNothing);
    },
  );
}
