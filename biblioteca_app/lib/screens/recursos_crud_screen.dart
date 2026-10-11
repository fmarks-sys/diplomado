import 'package:flutter/material.dart';
import '../services/recursos_service.dart';
import '../theme/app_theme.dart';
import 'recurso_form_screen.dart';

class RecursosCRUDScreen extends StatefulWidget {
  const RecursosCRUDScreen({super.key, this.service});
  final RecursosService? service;
  @override
  State<RecursosCRUDScreen> createState() => _RecursosCRUDScreenState();
}

class _RecursosCRUDScreenState extends State<RecursosCRUDScreen> {
  late final RecursosService _service;
  final _search = TextEditingController();
  final _scroll = ScrollController();
  List<Recurso> _resources = [];
  bool _loading = true;
  bool _mutating = false;
  String? _error;
  String _query = '';
  String _type = 'Todos';
  String _state = 'Todos';
  int _page = 0;
  static const _pageSize = 10;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? RecursosService();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  String _message(Object error) =>
      error.toString().replaceFirst('Exception: ', '');

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final resources = await _service.list();
      if (mounted) {
        setState(() {
          _resources = resources;
          _page = 0;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = _message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Recurso> get _filtered => _resources.where((item) {
    final haystack = [
      item['titulo'],
      item['codigo_topografico'],
      item['autor'],
      item['autor_postulante'],
      item['area_nombre'],
      if (item['palabras_clave'] is List) ...(item['palabras_clave'] as List),
    ].join(' ').toLowerCase();
    return haystack.contains(_query.toLowerCase()) &&
        (_type == 'Todos' || item['tipo_recurso'] == _type) &&
        (_state == 'Todos' || item['estado'] == _state);
  }).toList();

  void _reset(VoidCallback change) {
    setState(() {
      change();
      _page = 0;
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> _form([Recurso? item]) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => RecursoFormScreen(service: _service, recurso: item),
      ),
    );
    if (saved == true && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Recurso guardado')));
      await _load();
    }
  }

  Future<void> _changeState(Recurso item) async {
    var selected = item['estado'] as String;
    final result = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Cambiar estado'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${item['titulo']}'),
              const SizedBox(height: 18),
              DropdownButtonFormField<String>(
                initialValue: selected,
                isExpanded: true,
                items: [
                  for (final value in ['DISPONIBLE', 'MANTENIMIENTO', 'BAJA'])
                    DropdownMenuItem(value: value, child: Text(_label(value))),
                ],
                onChanged: (value) => update(() => selected = value!),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, selected),
              child: const Text('Aplicar'),
            ),
          ],
        ),
      ),
    );
    if (result != null && result != item['estado']) {
      await _mutate(
        () => _service.setState(item['id'], result),
        'Estado actualizado',
      );
    }
  }

  Future<void> _delete(Recurso item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar recurso'),
        content: Text(
          'Se eliminará definitivamente “${item['titulo']}”. Para conservar su ficha, utiliza el estado Baja.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Eliminar definitivamente',
              style: TextStyle(color: AppColors.penalty),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _mutate(() => _service.delete(item['id']), 'Recurso eliminado');
    }
  }

  Future<void> _mutate(
    Future<void> Function() operation,
    String message,
  ) async {
    if (_mutating) return;
    setState(() => _mutating = true);
    try {
      await operation();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_message(error))));
      }
    } finally {
      if (mounted) setState(() => _mutating = false);
    }
  }

  String _label(String state) => switch (state) {
    'DISPONIBLE' => 'Disponible',
    'MANTENIMIENTO' => 'Mantenimiento',
    'BAJA' => 'Baja',
    'LIBRO' => 'Libro',
    'TESIS' => 'Tesis',
    _ => state,
  };

  Widget _status(String status) {
    final color = status == 'BAJA'
        ? AppColors.penalty
        : status == 'MANTENIMIENTO'
        ? AppColors.borrowed
        : AppColors.available;
    final bg = status == 'BAJA'
        ? AppColors.penaltyBg
        : status == 'MANTENIMIENTO'
        ? AppColors.borrowedBg
        : AppColors.availableBg;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        _label(status),
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  void _details(Recurso item) {
    final fields = {
      'Código topográfico': item['codigo_topografico'],
      'Tipo': _label('${item['tipo_recurso']}'),
      'Año de publicación': item['anio_publicacion'],
      'Área': item['area_nombre'],
      'Ejemplares disponibles / total':
          '${item['cantidad_disponible']} / ${item['cantidad_total']}',
      'Estado': _label('${item['estado']}'),
      if (item['tipo_recurso'] == 'LIBRO') ...{
        'Autor': item['autor'],
        'ISBN': item['isbn'],
        'Editorial': item['editorial'],
        'Edición': item['edicion'],
      } else ...{
        'Autor postulante': item['autor_postulante'],
        'Tutor guía': item['tutor_guia'],
        'Gestión de defensa': item['gestion_defensa'],
        'Tribunal': item['tribunal_jurado'],
        'Soporte físico': item['soporte_fisico'],
        'URL del PDF': item['url_documento_pdf'],
      },
      'Palabras clave': item['palabras_clave'],
    };
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.75,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            children: [
              Text(
                '${item['titulo']}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: AppColors.blue,
                ),
              ),
              const SizedBox(height: 20),
              for (final entry in fields.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.key,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.muted,
                        ),
                      ),
                      const SizedBox(height: 3),
                      SelectableText(
                        entry.value is List
                            ? ((entry.value as List).isEmpty
                                  ? '—'
                                  : (entry.value as List).join(', '))
                            : (entry.value?.toString().isNotEmpty == true
                                  ? entry.value.toString()
                                  : '—'),
                      ),
                    ],
                  ),
                ),
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(sheetContext);
                  _form(item);
                },
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Editar recurso'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filter(
    String label,
    String value,
    List<String> options,
    ValueChanged<String> change,
  ) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
      ),
      items: options
          .map(
            (option) => DropdownMenuItem(
              value: option,
              child: Text(
                _label(option),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12),
              ),
            ),
          )
          .toList(),
      onChanged: (value) => _reset(() => change(value!)),
    );
  }

  Widget _empty(IconData icon, String message, {bool retry = false}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 38, color: AppColors.muted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.muted),
            ),
            if (retry)
              TextButton(onPressed: _load, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
    final pages = (filtered.length / _pageSize).ceil().clamp(1, 2147483647);
    final visible = filtered.skip(_page * _pageSize).take(_pageSize).toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestionar recursos'),
        actions: [
          IconButton(
            onPressed: _loading || _mutating ? null : _load,
            tooltip: 'Actualizar recursos',
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Catálogo bibliográfico',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: AppColors.blue,
                        ),
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: _mutating ? null : () => _form(),
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Agregar'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _search,
                  onChanged: (value) => _reset(() => _query = value),
                  decoration: const InputDecoration(
                    hintText: 'Título, código, autor o palabra clave',
                    prefixIcon: Icon(Icons.search, size: 21),
                  ),
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: _filter('Tipo', _type, [
                        'Todos',
                        'LIBRO',
                        'TESIS',
                      ], (value) => _type = value),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _filter('Estado', _state, [
                        'Todos',
                        'DISPONIBLE',
                        'MANTENIMIENTO',
                        'BAJA',
                      ], (value) => _state = value),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${filtered.length} recurso${filtered.length == 1 ? '' : 's'} · 10 por página',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          if (_mutating) const LinearProgressIndicator(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? _empty(Icons.cloud_off_outlined, _error!, retry: true)
                : filtered.isEmpty
                ? _empty(
                    Icons.menu_book_outlined,
                    _resources.isEmpty
                        ? 'Aún no hay recursos. Agrega el primero.'
                        : 'No hay recursos que coincidan con los filtros.',
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      controller: _scroll,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: visible.length,
                      itemBuilder: (context, index) {
                        final item = visible[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              leading: Container(
                                padding: const EdgeInsets.all(9),
                                decoration: BoxDecoration(
                                  color: AppColors.background,
                                  borderRadius: BorderRadius.circular(9),
                                ),
                                child: Icon(
                                  item['tipo_recurso'] == 'TESIS'
                                      ? Icons.school_outlined
                                      : Icons.menu_book_outlined,
                                  color: AppColors.blue,
                                ),
                              ),
                              title: Text(
                                '${item['titulo']}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 5),
                                  Text(
                                    '${item['codigo_topografico']} · ${item['cantidad_disponible']}/${item['cantidad_total']} disponibles',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  _status('${item['estado']}'),
                                ],
                              ),
                              onTap: () => _details(item),
                              trailing: PopupMenuButton<String>(
                                enabled: !_mutating,
                                tooltip: 'Opciones del recurso',
                                onSelected: (action) {
                                  switch (action) {
                                    case 'details':
                                      _details(item);
                                    case 'edit':
                                      _form(item);
                                    case 'state':
                                      _changeState(item);
                                    case 'delete':
                                      _delete(item);
                                  }
                                },
                                itemBuilder: (_) => const [
                                  PopupMenuItem(
                                    value: 'details',
                                    child: Text('Ver detalles'),
                                  ),
                                  PopupMenuItem(
                                    value: 'edit',
                                    child: Text('Editar'),
                                  ),
                                  PopupMenuItem(
                                    value: 'state',
                                    child: Text('Cambiar estado'),
                                  ),
                                  PopupMenuItem(
                                    value: 'delete',
                                    child: Text(
                                      'Eliminar',
                                      style: TextStyle(
                                        color: AppColors.penalty,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
          if (!_loading && _error == null && filtered.isNotEmpty)
            SafeArea(
              top: false,
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      tooltip: 'Página anterior',
                      onPressed: _page == 0
                          ? null
                          : () {
                              setState(() => _page--);
                              if (_scroll.hasClients) _scroll.jumpTo(0);
                            },
                      icon: const Icon(Icons.chevron_left),
                    ),
                    Text(
                      'Página ${_page + 1} de $pages',
                      style: const TextStyle(fontSize: 13),
                    ),
                    IconButton(
                      tooltip: 'Página siguiente',
                      onPressed: _page + 1 >= pages
                          ? null
                          : () {
                              setState(() => _page++);
                              if (_scroll.hasClients) _scroll.jumpTo(0);
                            },
                      icon: const Icon(Icons.chevron_right),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
