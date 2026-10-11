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
import 'package:biblioteca_app/screens/dashboard_screen.dart';
import 'package:biblioteca_app/services/dashboard_service.dart';
import 'package:biblioteca_app/theme/app_theme.dart';
import 'widget_test.dart' show jwt;

final fixtures = <String, List<Map<String, dynamic>>>{
  'recursos': [
    {
      'id': 1,
      'titulo': 'Ingeniería de software',
      'tipo_recurso': 'LIBRO',
      'codigo_topografico': 'INF-001',
      'cantidad_disponible': 4,
      'estado': 'DISPONIBLE',
    },
    {
      'id': 2,
      'titulo': 'Redes de computadoras',
      'tipo_recurso': 'LIBRO',
      'codigo_topografico': 'INF-002',
      'cantidad_disponible': 2,
      'estado': 'DISPONIBLE',
    },
  ],
  'lectores': [
    {
      'id': 1,
      'nombres': 'Juan',
      'ap': 'Pérez',
      'ru': '12345',
      'tipo_lector': 'ESTUDIANTE',
      'estado': 'ACTIVO',
    },
    {
      'id': 2,
      'nombres': 'Ana',
      'ap': 'López',
      'ru': '67890',
      'tipo_lector': 'ESTUDIANTE',
      'estado': 'ACTIVO',
    },
  ],
  'prestamos': [
    {
      'id': 1,
      'lector_nombre': 'Juan Pérez',
      'recurso_titulo': 'Ingeniería de software',
      'fecha_devolucion_prevista': '2026-10-15',
      'estado': 'PRESTADO',
    },
    {
      'id': 2,
      'lector_nombre': 'Ana López',
      'recurso_titulo': 'Redes de computadoras',
      'fecha_devolucion_prevista': '2026-10-08',
      'estado': 'VENCIDO',
    },
  ],
};

DashboardService service({int status = 200}) => DashboardService(
  client: MockClient((request) async {
    expect(request.headers['Authorization'], startsWith('Bearer '));
    expect(request.method, 'GET');
    return http.Response(
      jsonEncode(fixtures[request.url.path.split('/').last]),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  }),
);

Future<void> mount(WidgetTester tester, {int status = 200}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: RepaintBoundary(
        key: const Key('preview'),
        child: DashboardScreen(service: service(status: status)),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    final loader = FontLoader('Inter');
    loader.addFont(rootBundle.load('assets/fonts/Inter.ttf'));
    await loader.load();
    final icons = FontLoader('MaterialIcons');
    icons.addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });
  setUp(() {
    SharedPreferences.setMockInitialValues({'nombre_usuario': 'Carlos'});
    FlutterSecureStorage.setMockInitialValues({
      'jwt': jwt('BIBLIOTECARIO', 3600),
    });
  });

  testWidgets('Dashboard fits a phone and searches real loan data', (
    tester,
  ) async {
    await mount(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('¡Hola, Carlos!'), findsOneWidget);
    expect(find.text('Juan Pérez'), findsOneWidget);
    if (const bool.fromEnvironment('WRITE_PREVIEW')) {
      await tester.runAsync(() async {
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(const Key('preview')),
        );
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        await File(
          'design/dashboard-preview.png',
        ).writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }
    await tester.enterText(find.byType(TextField), 'Juan');
    await tester.pumpAndSettle();
    expect(find.text('Juan Pérez'), findsOneWidget);
    expect(find.text('Ana López'), findsNothing);
    await tester.enterText(find.byType(TextField), 'inexistente');
    await tester.pumpAndSettle();
    expect(find.text('No hay resultados para tu búsqueda.'), findsOneWidget);
  });

  testWidgets('Overdue card filters loans and details show due date', (
    tester,
  ) async {
    await mount(tester);
    await tester.tap(find.text('Vencidos'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Ana López'),
      150,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Juan Pérez'), findsNothing);
    expect(find.text('Ana López'), findsOneWidget);
    await tester.drag(find.byType(ListView).first, const Offset(0, -160));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ana López'));
    await tester.pumpAndSettle();
    expect(find.text('Devolución prevista'), findsOneWidget);
    expect(find.text('2026-10-08'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Network failure has retry and no fabricated metrics', (
    tester,
  ) async {
    await mount(tester, status: 500);
    expect(find.text('Reintentar'), findsOneWidget);
    expect(find.text('0'), findsNothing);
    expect(find.text('—'), findsNWidgets(4));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Small phone with larger text has no overflow', (tester) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        builder: (_, child) => MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 720),
            textScaler: TextScaler.linear(1.3),
          ),
          child: child!,
        ),
        home: DashboardScreen(service: service()),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
