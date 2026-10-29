import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../services/recurso_photo_picker.dart';
import '../services/recursos_service.dart';
import '../theme/app_theme.dart';

class RecursoFormScreen extends StatefulWidget {
  const RecursoFormScreen({
    super.key,
    required this.service,
    this.recurso,
    this.photoPicker,
  });
  final RecursosService service;
  final Recurso? recurso;
  final RecursoPhotoPicker? photoPicker;
  @override
  State<RecursoFormScreen> createState() => _RecursoFormScreenState();
}

class _RecursoFormScreenState extends State<RecursoFormScreen> {
  final _form = GlobalKey<FormState>();
  final Map<String, TextEditingController> _fields = {};
  late String _type;
  late String _support;
  int? _area;
  List<Recurso> _areas = [];
  bool _loadingAreas = true;
  String? _areaError;
  String? _error;
  bool _saving = false;
  bool _scanning = false;
  String? _scanError;
  late final RecursoPhotoPicker _photoPicker;
  bool get _busy => _saving || _scanning;

  @override
  void initState() {
    super.initState();
    _photoPicker = widget.photoPicker ?? RecursoPhotoPicker();
    final item = widget.recurso ?? {};
    _type = item['tipo_recurso'] ?? 'LIBRO';
    _support = item['soporte_fisico'] ?? 'EMPASTADO';
    _area = item['area_id'];
    for (final name in [
      'codigo_topografico',
      'titulo',
      'anio_publicacion',
      'cantidad_total',
      'autor',
      'isbn',
      'editorial',
      'edicion',
      'autor_postulante',
      'tutor_guia',
      'gestion_defensa',
      'tribunal_jurado',
      'url_documento_pdf',
      'palabras_clave',
    ]) {
      final value = item[name];
      _fields[name] = TextEditingController(
        text: value is List
            ? value.join(', ')
            : value?.toString() ?? (name == 'cantidad_total' ? '1' : ''),
      );
    }
    _loadAreas();
    _recoverPhoto();
  }

  Future<void> _recoverPhoto() async {
    try {
      final photo = await _photoPicker.recover();
      if (photo == null || !mounted || _busy) return;
      final accepted = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Fotografía recuperada'),
          content: const Text(
            'Se recuperó una foto de un escaneo interrumpido. ¿Quieres enviarla al escáner IA para revisar sus datos?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Descartar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Analizar'),
            ),
          ],
        ),
      );
      if (accepted == true && mounted) await _scan(photo: photo);
    } catch (_) {
      // A recovery failure must never prevent manual registration.
    }
  }

  Future<void> _choosePhoto() async {
    if (_busy) return;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Escanear recurso con IA',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              const Text(
                'La foto se enviará al servicio de IA. Usa una portada o página bibliográfica legible, sin datos personales sensibles.',
                style: TextStyle(color: AppColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Tomar foto'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Elegir de galería'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source != null && mounted) await _scan(source: source);
  }

  Future<void> _scan({ImageSource? source, XFile? photo}) async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _scanning = true;
      _scanError = null;
    });
    try {
      final file = photo ?? await _photoPicker.pick(source!);
      if (file == null || !mounted) return;
      if (await file.length() > RecursosService.maxImageBytes) {
        throw Exception(
          'La foto supera 3 MiB. Selecciona una imagen más pequeña.',
        );
      }
      final data = await widget.service.scan(await file.readAsBytes());
      if (!mounted) return;
      final suggestions = <String, String>{
        if (data['titulo'] != null &&
            data['titulo'].toString().trim().isNotEmpty)
          'titulo': data['titulo'],
        if (data['autor'] != null && data['autor'].toString().trim().isNotEmpty)
          (_type == 'TESIS' ? 'autor_postulante' : 'autor'): data['autor'],
        if (data['anio_publicacion'] != null)
          'anio_publicacion': data['anio_publicacion'].toString(),
        if (_type == 'LIBRO' &&
            data['isbn'] != null &&
            data['isbn'].toString().trim().isNotEmpty)
          'isbn': data['isbn'],
      };
      if (suggestions.isEmpty) {
        throw Exception(
          'No se detectaron datos legibles. Prueba otra fotografía o completa el formulario manualmente.',
        );
      }
      const labels = {
        'titulo': 'Título',
        'autor': 'Autor',
        'autor_postulante': 'Autor postulante',
        'anio_publicacion': 'Año de publicación',
        'isbn': 'ISBN',
      };
      final selected = suggestions.keys
          .where((key) => _fields[key]!.text.trim().isEmpty)
          .toSet();
      final approved = await showDialog<Set<String>>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, update) => AlertDialog(
            title: const Text('Revisar datos reconocidos'),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'La IA puede equivocarse. Selecciona los campos que deseas aplicar y corrígelos en el formulario antes de guardar.',
                      style: TextStyle(fontSize: 13, color: AppColors.muted),
                    ),
                    const SizedBox(height: 12),
                    for (final entry in suggestions.entries)
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        title: Text(
                          labels[entry.key]!,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          '${entry.value}${_fields[entry.key]!.text.trim().isEmpty ? '' : '\nActual: ${_fields[entry.key]!.text}\nSelecciona para reemplazarlo.'}',
                        ),
                        value: selected.contains(entry.key),
                        onChanged: (value) => update(() {
                          if (value == true) {
                            selected.add(entry.key);
                          } else {
                            selected.remove(entry.key);
                          }
                        }),
                      ),
                    const SizedBox(height: 8),
                    const Text(
                      'Los campos no reconocidos se conservan.',
                      style: TextStyle(fontSize: 12, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: selected.isEmpty
                    ? null
                    : () => Navigator.pop(context, Set<String>.of(selected)),
                child: const Text('Aplicar seleccionados'),
              ),
            ],
          ),
        ),
      );
      if (approved != null && mounted) {
        setState(() {
          for (final key in approved) {
            _fields[key]!.text = suggestions[key]!;
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Datos aplicados. Revisa la ficha antes de guardar.'),
          ),
        );
      }
    } on PlatformException {
      if (mounted) {
        setState(
          () => _scanError =
              'No se pudo abrir la cámara o galería. Revisa los permisos de la app o elige otra opción.',
        );
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _scanError = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _loadAreas() async {
    setState(() {
      _loadingAreas = true;
      _areaError = null;
    });
    try {
      final areas = await widget.service.areas();
      if (mounted) setState(() => _areas = areas);
    } catch (error) {
      if (mounted) {
        setState(
          () => _areaError = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingAreas = false);
    }
  }

  @override
  void dispose() {
    for (final field in _fields.values) {
      field.dispose();
    }
    super.dispose();
  }

  List<String> _split(String name) => _fields[name]!.text
      .split(',')
      .map((part) => part.trim())
      .where((part) => part.isNotEmpty)
      .toList();

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _error = null;
    });
    final payload = <String, dynamic>{
      'codigo_topografico': _fields['codigo_topografico']!.text.trim(),
      'titulo': _fields['titulo']!.text.trim(),
      'anio_publicacion': int.parse(_fields['anio_publicacion']!.text.trim()),
      'area_id': _area,
      'tipo_recurso': _type,
      'palabras_clave': _split('palabras_clave'),
    };
    if (_type == 'LIBRO') {
      for (final key in ['autor', 'isbn', 'editorial', 'edicion']) {
        payload[key] = _fields[key]!.text.trim();
      }
      payload['cantidad_total'] = int.parse(
        _fields['cantidad_total']!.text.trim(),
      );
    } else {
      for (final key in [
        'autor_postulante',
        'tutor_guia',
        'gestion_defensa',
        'url_documento_pdf',
      ]) {
        payload[key] = _fields[key]!.text.trim();
      }
      payload['tribunal_jurado'] = _split('tribunal_jurado');
      payload['soporte_fisico'] = _support;
      payload['cantidad_total'] = 1;
    }
    try {
      await widget.service.save(payload, id: widget.recurso?['id']);
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(
    String key,
    String label, {
    bool required = false,
    bool number = false,
    int lines = 1,
    String? help,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        key: ValueKey(key),
        controller: _fields[key],
        enabled: !_busy,
        decoration: InputDecoration(
          labelText: '$label${required ? ' *' : ''}',
          helperText: help,
        ),
        minLines: lines,
        maxLines: lines,
        keyboardType: number
            ? TextInputType.number
            : lines > 1
            ? TextInputType.multiline
            : TextInputType.text,
        validator: (text) {
          final value = text?.trim() ?? '';
          if (required && value.isEmpty) return 'Este campo es obligatorio';
          if (number && value.isNotEmpty) {
            final n = int.tryParse(value);
            if (!RegExp(r'^\d+$').hasMatch(value) ||
                n == null ||
                n < 1 ||
                n > 2147483647) {
              return 'Ingresa un entero mayor o igual a 1';
            }
          }
          if (key == 'url_documento_pdf' && value.isNotEmpty) {
            final uri = Uri.tryParse(value);
            if (uri == null ||
                !['http', 'https'].contains(uri.scheme) ||
                !uri.hasAuthority) {
              return 'Ingresa una URL http o https válida';
            }
          }
          return null;
        },
      ),
    );
  }

  Widget _section(String title, String subtitle, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 17,
              color: AppColors.blue,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final areaChoices = _areas
        .where((area) => area['estado'] == 'ACTIVO' || area['id'] == _area)
        .toList();
    if (_area != null && !areaChoices.any((area) => area['id'] == _area)) {
      areaChoices.add({
        'id': _area,
        'nombre': widget.recurso?['area_nombre'] ?? 'Área $_area',
      });
    }
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.recurso == null ? 'Agregar recurso' : 'Editar recurso',
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: AppColors.penalty),
                    ),
                  ),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: _busy ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check),
                    label: Text(_saving ? 'Guardando...' : 'Guardar recurso'),
                  ),
                ),
              ],
            ),
          ),
        ),
        body: Form(
          key: _form,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Completa la ficha bibliográfica.',
                  style: TextStyle(color: AppColors.muted),
                ),
                const SizedBox(height: 8),
                const Text(
                  '* Campos obligatorios',
                  style: TextStyle(color: AppColors.muted, fontSize: 11),
                ),
                const SizedBox(height: 20),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'LIBRO',
                      label: Text('Libro'),
                      icon: Icon(Icons.menu_book_outlined),
                    ),
                    ButtonSegment(
                      value: 'TESIS',
                      label: Text('Tesis'),
                      icon: Icon(Icons.school_outlined),
                    ),
                  ],
                  selected: {_type},
                  onSelectionChanged: _busy
                      ? null
                      : (selection) => setState(() => _type = selection.first),
                ),
                const SizedBox(height: 20),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _choosePhoto,
                  icon: _scanning
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.document_scanner_outlined),
                  label: Text(
                    _scanning
                        ? 'Analizando fotografía...'
                        : 'Escanear recurso con IA',
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Autocompleta título, autor, año e ISBN. Revisa siempre los datos reconocidos.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                if (_scanError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(
                      '$_scanError Puedes continuar con el registro manual.',
                      style: const TextStyle(
                        color: AppColors.penalty,
                        fontSize: 12,
                      ),
                    ),
                  ),
                const SizedBox(height: 20),
                _section(
                  'Datos generales',
                  'Identificación y clasificación del recurso.',
                  [
                    _field(
                      'codigo_topografico',
                      'Código topográfico',
                      required: true,
                    ),
                    _field('titulo', 'Título', required: true, lines: 2),
                    _field(
                      'anio_publicacion',
                      'Año de publicación',
                      required: true,
                      number: true,
                    ),
                    if (_loadingAreas) const LinearProgressIndicator(),
                    DropdownButtonFormField<int>(
                      key: ValueKey('area_$_area${_areas.length}'),
                      initialValue: _area,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Área o mención',
                      ),
                      items: [
                        const DropdownMenuItem<int>(
                          value: null,
                          child: Text('Sin área asignada'),
                        ),
                        for (final area in areaChoices)
                          DropdownMenuItem<int>(
                            value: area['id'],
                            child: Text(
                              '${area['nombre']}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: _busy || _loadingAreas
                          ? null
                          : (value) => setState(() => _area = value),
                    ),
                    if (_areaError != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _areaError!,
                        style: const TextStyle(
                          color: AppColors.penalty,
                          fontSize: 12,
                        ),
                      ),
                      TextButton(
                        onPressed: _loadAreas,
                        child: const Text('Reintentar áreas'),
                      ),
                    ],
                    const SizedBox(height: 16),
                    _field(
                      'palabras_clave',
                      'Palabras clave',
                      help: 'Separa las palabras con comas.',
                    ),
                  ],
                ),
                if (_type == 'LIBRO')
                  _section(
                    'Información del libro',
                    'Autor, edición y ejemplares del catálogo.',
                    [
                      _field('autor', 'Autor', required: true),
                      _field('isbn', 'ISBN'),
                      _field('editorial', 'Editorial'),
                      _field('edicion', 'Edición'),
                      _field(
                        'cantidad_total',
                        'Cantidad total de ejemplares',
                        required: true,
                        number: true,
                      ),
                    ],
                  )
                else
                  _section(
                    'Información de la tesis',
                    'Datos del trabajo y su defensa.',
                    [
                      _field(
                        'autor_postulante',
                        'Autor postulante',
                        required: true,
                      ),
                      _field('tutor_guia', 'Tutor guía', required: true),
                      _field(
                        'gestion_defensa',
                        'Gestión de defensa',
                        required: true,
                      ),
                      _field(
                        'tribunal_jurado',
                        'Tribunal o jurado',
                        lines: 2,
                        help: 'Separa los nombres con comas.',
                      ),
                      DropdownButtonFormField<String>(
                        initialValue: _support,
                        decoration: const InputDecoration(
                          labelText: 'Soporte físico',
                        ),
                        items: [
                          for (final value in [
                            'EMPASTADO',
                            'CD',
                            'DIGITAL',
                            'AMBOS',
                          ])
                            DropdownMenuItem(value: value, child: Text(value)),
                        ],
                        onChanged: _busy
                            ? null
                            : (value) => setState(() => _support = value!),
                      ),
                      const SizedBox(height: 16),
                      _field('url_documento_pdf', 'URL del documento PDF'),
                      const Text(
                        'Cada tesis corresponde a 1 ejemplar.',
                        style: TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
