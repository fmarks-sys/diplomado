import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:biblioteca_app/services/recursos_service.dart';
import 'package:biblioteca_app/services/recurso_photo_picker.dart';
import 'package:biblioteca_app/screens/recurso_form_screen.dart';
import 'package:biblioteca_app/theme/app_theme.dart';
import 'widget_test.dart' show jwt;

final png = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=',
);
const recognized = {
  'titulo': 'Libro detectado',
  'autor': 'Autor detectado',
  'anio_publicacion': 2024,
  'isbn': '9780306406157',
};

class Picker extends RecursoPhotoPicker {
  Picker({this.cancel = false, this.lost = false});
  final bool cancel;
  final bool lost;
  ImageSource? source;
  @override
  Future<XFile?> pick(ImageSource source) async {
    this.source = source;
    return cancel ? null : XFile.fromData(png, name: 'portada.png');
  }

  @override
  Future<XFile?> recover() async =>
      lost ? XFile.fromData(png, name: 'recuperada.png') : null;
}

class Scanner {
  Scanner({this.data = recognized, this.status = 200});
  final Map<String, dynamic> data;
  final int status;
  final scans = <http.Request>[];
  final saves = <http.Request>[];
  late final service = RecursosService(
    client: MockClient((request) async {
      if (request.method == 'GET') return http.Response('[]', 200);
      if (request.url.path.endsWith('/escanear')) {
        scans.add(request);
        return http.Response(
          jsonEncode(
            status == 200
                ? {'data': data, 'requiere_revision': true}
                : {'error': 'Cuota agotada'},
          ),
          status,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }
      saves.add(request);
      return http.Response('{}', 201);
    }),
  );
}

Future<void> mount(
  WidgetTester tester,
  Scanner scanner,
  Picker picker, {
  bool thesis = false,
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: RecursoFormScreen(
        service: scanner.service,
        photoPicker: picker,
        recurso: {
          'tipo_recurso': thesis ? 'TESIS' : 'LIBRO',
          'titulo': 'Título manual',
        },
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> scan(WidgetTester tester, {bool camera = false}) async {
  await tester.ensureVisible(find.text('Escanear recurso con IA'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Escanear recurso con IA'));
  await tester.pumpAndSettle();
  await tester.tap(find.text(camera ? 'Tomar foto' : 'Elegir de galería'));
  // While the review dialog is open, the underlying screen still has a progress indicator.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 600));
}

String text(WidgetTester tester, String key) =>
    tester.widget<TextFormField>(find.byKey(ValueKey(key))).controller!.text;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({
      'jwt': jwt('BIBLIOTECARIO', 3600),
    });
  });

  test('Scan sends image to Railway with JWT and no Gemini key', () async {
    final api = Scanner();
    expect(await api.service.scan(png), recognized);
    final request = api.scans.single;
    expect(request.url.scheme, 'https');
    expect(request.url.path, '/api/recursos/escanear');
    expect(request.headers['Authorization'], startsWith('Bearer '));
    expect(request.headers.containsKey('x-goog-api-key'), isFalse);
    expect(jsonDecode(request.body), {
      'mime_type': 'image/png',
      'imagen_base64': base64Encode(png),
    });
    expect(api.saves, isEmpty);
  });

  test('Oversized and unsupported files never reach the backend', () async {
    final api = Scanner();
    await expectLater(
      api.service.scan(Uint8List(RecursosService.maxImageBytes + 1)),
      throwsException,
    );
    await expectLater(
      api.service.scan(Uint8List.fromList([1, 2, 3])),
      throwsException,
    );
    expect(api.scans, isEmpty);
  });

  testWidgets(
    'Review preserves existing fields and only explicit selection replaces them',
    (tester) async {
      final api = Scanner();
      final picker = Picker();
      await mount(tester, api, picker);
      await scan(tester);
      expect(picker.source, ImageSource.gallery);
      expect(find.text('Revisar datos reconocidos'), findsOneWidget);
      expect(text(tester, 'titulo'), 'Título manual');
      expect(text(tester, 'autor'), '');
      await tester.tap(find.text('Aplicar seleccionados'));
      await tester.pumpAndSettle();
      expect(text(tester, 'titulo'), 'Título manual');
      expect(text(tester, 'autor'), 'Autor detectado');
      expect(text(tester, 'anio_publicacion'), '2024');
      expect(text(tester, 'isbn'), '9780306406157');
      expect(api.saves, isEmpty);
      await scan(tester);
      final titleChoice = find.widgetWithText(CheckboxListTile, 'Título');
      await tester.tap(titleChoice);
      await tester.pump();
      await tester.tap(find.text('Aplicar seleccionados'));
      await tester.pumpAndSettle();
      expect(text(tester, 'titulo'), 'Libro detectado');
      expect(api.saves, isEmpty);
    },
  );

  testWidgets('Thesis author maps to postulante; tutor is never invented', (
    tester,
  ) async {
    final api = Scanner();
    final picker = Picker();
    await mount(tester, api, picker, thesis: true);
    await scan(tester, camera: true);
    expect(picker.source, ImageSource.camera);
    expect(find.text('Autor postulante'), findsOneWidget);
    await tester.tap(find.text('Aplicar seleccionados'));
    await tester.pumpAndSettle();
    expect(text(tester, 'autor_postulante'), 'Autor detectado');
    expect(text(tester, 'tutor_guia'), '');
    expect(text(tester, 'gestion_defensa'), '');
    expect(find.byKey(const ValueKey('isbn')), findsNothing);
    expect(api.saves, isEmpty);
  });

  testWidgets(
    'Cancelled selection makes no request and manual registration remains available',
    (tester) async {
      final api = Scanner();
      await mount(tester, api, Picker(cancel: true));
      await scan(tester);
      await tester.pumpAndSettle();
      expect(api.scans, isEmpty);
      expect(text(tester, 'titulo'), 'Título manual');
      expect(
        tester
            .widget<FilledButton>(
              find.widgetWithText(FilledButton, 'Guardar recurso'),
            )
            .onPressed,
        isNotNull,
      );
    },
  );

  testWidgets('Rate-limit error preserves input and restores controls', (
    tester,
  ) async {
    final api = Scanner(status: 429);
    await mount(tester, api, Picker());
    await scan(tester);
    await tester.pumpAndSettle();
    expect(find.textContaining('Cuota agotada'), findsOneWidget);
    expect(text(tester, 'titulo'), 'Título manual');
    expect(
      tester
          .widget<OutlinedButton>(
            find.widgetWithText(OutlinedButton, 'Escanear recurso con IA'),
          )
          .onPressed,
      isNotNull,
    );
    expect(api.saves, isEmpty);
  });

  testWidgets('All null fields do not clear manually entered values', (
    tester,
  ) async {
    final api = Scanner(
      data: {
        'titulo': null,
        'autor': null,
        'anio_publicacion': null,
        'isbn': null,
      },
    );
    await mount(tester, api, Picker());
    await scan(tester);
    await tester.pumpAndSettle();
    expect(
      find.textContaining('No se detectaron datos legibles'),
      findsOneWidget,
    );
    expect(text(tester, 'titulo'), 'Título manual');
    expect(api.saves, isEmpty);
  });

  testWidgets('Recovered photograph requires confirmation before any upload', (
    tester,
  ) async {
    final api = Scanner();
    await mount(tester, api, Picker(lost: true));
    expect(find.text('Fotografía recuperada'), findsOneWidget);
    expect(api.scans, isEmpty);
    await tester.tap(find.text('Descartar'));
    await tester.pumpAndSettle();
    expect(api.scans, isEmpty);
    expect(text(tester, 'titulo'), 'Título manual');
  });
}
