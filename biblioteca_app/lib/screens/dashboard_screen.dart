import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/session_service.dart';
import '../services/dashboard_service.dart';
import '../theme/app_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.service});
  final DashboardService? service;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _username = '';
  String _query = '';
  String _filter = 'Todos';
  int _section = 0;
  bool _loading = true;
  String? _error;
  DashboardData? _data;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(
      () => _username = prefs.getString('nombre_usuario') ?? 'Bibliotecario',
    );
    try {
      final data = await (widget.service ?? DashboardService()).load();
      if (mounted) setState(() => _data = data);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'No pudimos actualizar los datos. Revisa tu conexión e intenta nuevamente.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await SessionService.clear();
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
    }
  }

  void _selectSection(int section, {String filter = 'Todos'}) {
    setState(() {
      _section = section;
      _filter = filter;
    });
  }

  String _date(DateTime date) {
    const days = [
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return '${days[date.weekday - 1]}, ${date.day} de ${months[date.month - 1]} de ${date.year}';
  }

  String _readerName(DashboardItem item) =>
      ['nombres', 'ap', 'am'].map((key) => item[key] ?? '').join(' ').trim();

  String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty);
    return parts.take(2).map((part) => part[0]).join().toUpperCase();
  }

  List<DashboardItem> get _items {
    final data = _data;
    if (data == null || _error != null) return [];
    final source = [_data!.loans, _data!.resources, _data!.readers][_section];
    return source.where((item) {
      final text = [
        _readerName(item),
        item['lector_nombre'],
        item['recurso_titulo'],
        item['titulo'],
        item['ru'],
        item['codigo_topografico'],
        item['estado'],
      ].join(' ').toLowerCase();
      return text.contains(_query.toLowerCase()) &&
          (_filter == 'Todos' || item['estado'] == _filter);
    }).toList();
  }

  void _showFilters() {
    final statuses = [
      ['Todos', 'PRESTADO', 'VENCIDO', 'DEVUELTO'],
      ['Todos', 'DISPONIBLE', 'BAJA'],
      ['Todos', 'ACTIVO', 'SANCIONADO', 'INACTIVO'],
    ][_section];
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Filtrar por estado',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final status in statuses)
                    ChoiceChip(
                      label: Text(
                        status == 'Todos' ? status : _statusLabel(status),
                      ),
                      selected: _filter == status,
                      onSelected: (_) {
                        setState(() => _filter = status);
                        Navigator.pop(sheetContext);
                      },
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(String status) => switch (status) {
    'PRESTADO' => 'Prestado',
    'VENCIDO' => 'Vencido',
    'DEVUELTO' => 'Devuelto',
    'DISPONIBLE' => 'Disponible',
    'BAJA' => 'Baja',
    'ACTIVO' => 'Activo',
    'SANCIONADO' => 'Sancionado',
    'INACTIVO' => 'Inactivo',
    _ => status,
  };

  Widget _badge(String status) {
    final danger = [
      'VENCIDO',
      'SANCIONADO',
      'BAJA',
      'INACTIVO',
    ].contains(status);
    final borrowed = status == 'PRESTADO';
    final bg = danger
        ? AppColors.penaltyBg
        : borrowed
        ? AppColors.borrowedBg
        : AppColors.availableBg;
    final fg = danger
        ? AppColors.penalty
        : borrowed
        ? AppColors.borrowed
        : AppColors.available;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        _statusLabel(status),
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }

  void _showDetails(DashboardItem item, String title) {
    final fields = switch (_section) {
      0 => {
        'Lector': item['lector_nombre'],
        'Recurso': item['recurso_titulo'],
        'Estado': item['estado'],
        'Devolución prevista': item['fecha_devolucion_prevista']
            ?.toString()
            .split('T')
            .first,
      },
      1 => {
        'Código': item['codigo_topografico'],
        'Tipo': item['tipo_recurso'],
        'Área': item['area_nombre'],
        'Disponibles': item['cantidad_disponible'],
        'Estado': item['estado'],
      },
      _ => {
        'RU': item['ru'],
        'Tipo': item['tipo_lector'],
        'Correo': item['correo'],
        'Estado': item['estado'],
      },
    };
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              for (final field in fields.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        field.key,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        '${field.value ?? '—'}',
                        style: const TextStyle(fontSize: 15),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showProfile() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: AppColors.blue,
                foregroundColor: Colors.white,
                child: Text(_initials(_username)),
              ),
              const SizedBox(height: 12),
              Text(
                _username,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Text(
                'Bibliotecario · Biblioteca Informática',
                style: TextStyle(color: AppColors.muted),
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _logout,
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar sesión'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metric(
    String title,
    int? value,
    IconData icon,
    String caption,
    Color color,
    Color tint,
    VoidCallback onTap,
  ) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.muted,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: tint,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 20, color: color),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                value?.toString() ?? '—',
                style: const TextStyle(
                  fontSize: 30,
                  height: 1.15,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkBlue,
                ),
              ),
              const SizedBox(height: 8),
              Text(caption, style: TextStyle(color: color, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _itemCard(DashboardItem item) {
    final title = _section == 0
        ? '${item['lector_nombre'] ?? 'Lector'}'
        : _section == 1
        ? '${item['titulo'] ?? 'Recurso'}'
        : _readerName(item);
    final subtitle = _section == 0
        ? '${item['recurso_titulo'] ?? ''}'
        : _section == 1
        ? '${item['tipo_recurso'] ?? ''} · ${item['codigo_topografico'] ?? ''}'
        : '${item['tipo_lector'] ?? ''} · RU ${item['ru'] ?? '—'}';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _showDetails(item, title),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.blue,
                  foregroundColor: Colors.white,
                  child: _section == 1
                      ? const Icon(Icons.menu_book_outlined, size: 20)
                      : Text(
                          _initials(title),
                          style: const TextStyle(fontSize: 13),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (_section == 0) ...[
                      Text(
                        item['fecha_devolucion_prevista']
                                ?.toString()
                                .split('T')
                                .first ??
                            '—',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.muted,
                        ),
                      ),
                      const SizedBox(height: 5),
                    ],
                    _badge('${item['estado'] ?? ''}'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = _error == null && !_loading ? _data : null;
    final items = _items;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.local_library, size: 23),
            SizedBox(width: 8),
            Flexible(
              child: Text(
                'Biblioteca Inf',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _showProfile,
            tooltip: 'Mi cuenta',
            icon: CircleAvatar(
              radius: 15,
              backgroundColor: AppColors.blue,
              foregroundColor: Colors.white,
              child: Text(
                _initials(_username),
                style: const TextStyle(fontSize: 11),
              ),
            ),
          ),
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout, size: 21),
            tooltip: 'Cerrar sesión',
          ),
          const SizedBox(width: 8),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppColors.border),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
          children: [
            Row(
              children: [
                const Icon(
                  Icons.shield_outlined,
                  size: 14,
                  color: AppColors.goldAccent,
                ),
                const SizedBox(width: 6),
                const Expanded(
                  child: Text(
                    'PANEL DEL BIBLIOTECARIO',
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.4,
                      fontWeight: FontWeight.w600,
                      color: AppColors.muted,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '¡Hola, ${_username.isEmpty ? 'Bibliotecario' : _username}!',
              style: const TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.7,
                color: AppColors.darkBlue,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              _date(DateTime.now()),
              style: const TextStyle(fontSize: 12, color: AppColors.muted),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: () =>
                  Navigator.pushNamed(context, '/recursos-crud').then((_) {
                    if (mounted) _load();
                  }),
              icon: const Icon(
                Icons.library_add_outlined,
                color: AppColors.gold,
                size: 19,
              ),
              label: const Text('Gestionar recursos'),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _search,
              onChanged: (value) => setState(() => _query = value),
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Buscar libros, lectores o préstamos...',
                hintStyle: const TextStyle(
                  fontSize: 12,
                  color: AppColors.muted,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: AppColors.muted,
                  size: 21,
                ),
                suffixIcon: IconButton(
                  onPressed: _showFilters,
                  tooltip: 'Filtrar por estado',
                  icon: Icon(
                    Icons.tune,
                    color: _filter == 'Todos'
                        ? AppColors.blue
                        : AppColors.goldAccent,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            LayoutBuilder(
              builder: (context, constraints) {
                final width = (constraints.maxWidth - 12) / 2;
                return Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    SizedBox(
                      width: width,
                      child: _metric(
                        'Recursos',
                        data?.resources.length,
                        Icons.menu_book_outlined,
                        'En el catálogo',
                        AppColors.blue,
                        const Color(0xFFE8EEF6),
                        () => _selectSection(1),
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: _metric(
                        'Activos',
                        data?.activeLoans,
                        Icons.description_outlined,
                        'Sin devolver',
                        AppColors.lightBlue,
                        const Color(0xFFE8EEF6),
                        () => _selectSection(0),
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: _metric(
                        'Lectores',
                        data?.readers.length,
                        Icons.people_outline,
                        'Registrados',
                        AppColors.available,
                        AppColors.availableBg,
                        () => _selectSection(2),
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: _metric(
                        'Vencidos',
                        data?.overdueLoans,
                        Icons.error_outline,
                        'Requieren atención',
                        AppColors.penalty,
                        AppColors.penaltyBg,
                        () => _selectSection(0, filter: 'VENCIDO'),
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Actividad de la biblioteca',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                ),
                IconButton(
                  onPressed: _loading ? null : _load,
                  tooltip: 'Actualizar',
                  icon: const Icon(
                    Icons.refresh,
                    color: AppColors.muted,
                    size: 20,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2F6),
                borderRadius: BorderRadius.circular(10),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  for (final entry in [
                    'Préstamos',
                    'Recursos',
                    'Lectores',
                  ].asMap().entries)
                    Expanded(
                      child: Material(
                        color: _section == entry.key
                            ? Colors.white
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(7),
                        child: InkWell(
                          onTap: () => _selectSection(entry.key),
                          borderRadius: BorderRadius.circular(7),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            child: Center(
                              child: Text(
                                entry.value,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: _section == entry.key
                                      ? FontWeight.w600
                                      : FontWeight.w400,
                                  color: _section == entry.key
                                      ? AppColors.blue
                                      : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_filter != 'Todos')
              Align(
                alignment: Alignment.centerLeft,
                child: InputChip(
                  label: Text(_statusLabel(_filter)),
                  onDeleted: () => setState(() => _filter = 'Todos'),
                ),
              ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(28),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              _empty(
                Icons.cloud_off_outlined,
                _error!,
                action: 'Reintentar',
                onPressed: _load,
              )
            else if (items.isEmpty)
              _empty(
                Icons.inbox_outlined,
                _query.isNotEmpty || _filter != 'Todos'
                    ? 'No hay resultados para tu búsqueda.'
                    : 'Todavía no hay registros en esta sección.',
              )
            else
              ...items.take(10).map(_itemCard),
            if (items.length > 10)
              TextButton(
                onPressed: () => _showAll(items),
                child: Text('Ver los ${items.length} registros'),
              ),
            const SizedBox(height: 14),
            Center(
              child: Text(
                'UAJMS · Biblioteca de Ingeniería Informática',
                style: TextStyle(
                  fontSize: 10,
                  color: AppColors.muted.withValues(alpha: 0.85),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              _nav(
                Icons.home_outlined,
                'Inicio',
                _section == 0 && _filter == 'Todos',
                () => _selectSection(0),
              ),
              _nav(
                Icons.menu_book_outlined,
                'Recursos',
                _section == 1,
                () => _selectSection(1),
              ),
              _nav(
                Icons.receipt_long_outlined,
                'Préstamos',
                false,
                () => _showAll(_data?.loans ?? []),
              ),
              _nav(
                Icons.people_outline,
                'Lectores',
                _section == 2,
                () => _selectSection(2),
              ),
              _nav(Icons.person_outline, 'Perfil', false, _showProfile),
            ],
          ),
        ),
      ),
    );
  }

  Widget _nav(IconData icon, String label, bool selected, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: selected ? AppColors.blue : AppColors.muted,
                size: 22,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  color: selected ? AppColors.blue : AppColors.muted,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _empty(
    IconData icon,
    String message, {
    String? action,
    VoidCallback? onPressed,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Icon(icon, color: AppColors.muted, size: 30),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          if (action != null)
            TextButton(onPressed: onPressed, child: Text(action)),
        ],
      ),
    );
  }

  void _showAll(List<DashboardItem> items) {
    // The bottom navigation selects loans before opening the full list.
    if (_section != 0 && identical(items, _data?.loans)) _selectSection(0);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.7,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                ['Préstamos', 'Recursos', 'Lectores'][_section],
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              if (items.isEmpty)
                _empty(Icons.inbox_outlined, 'Todavía no hay registros.')
              else
                ...items.map(_itemCard),
            ],
          ),
        ),
      ),
    );
  }
}
