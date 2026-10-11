import 'package:flutter/material.dart';
import '../services/session_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _auth = AuthService();
  bool _loading = false;
  bool _hidden = true;

  Future<void> _login() async {
    if (_loading) return;
    if (_username.text.trim().isEmpty || _password.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor llena todos los campos')),
      );
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _loading = true);
    try {
      final data = await _auth.loginRequest(
        _username.text.trim(),
        _password.text,
      );
      await SessionService.save(data['token'], data['user']['username']);
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/dashboard', (_) => false);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', '')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _help(bool password) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(password ? 'Recuperar acceso' : 'Soporte de acceso'),
        content: Text(
          password
              ? 'Solicita al administrador del sistema que restablezca tu contraseña. Indica tu usuario; nunca compartas tu contraseña.'
              : 'Contacta al administrador de Biblioteca Informática UAJMS para verificar tu cuenta y el permiso de Bibliotecario.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBlue,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _LoginBackground())),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 32,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: (constraints.maxHeight - 64).clamp(
                        0,
                        double.infinity,
                      ),
                    ),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: 0.6),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.2),
                                blurRadius: 36,
                                offset: const Offset(0, 16),
                              ),
                            ],
                          ),
                          child: AutofillGroup(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.blue,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.local_library_outlined,
                                        color: AppColors.gold,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    const Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'UAJMS',
                                            style: TextStyle(
                                              letterSpacing: 2,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.blue,
                                            ),
                                          ),
                                          SizedBox(height: 4),
                                          Text(
                                            'Biblioteca Informática',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: AppColors.muted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 28),
                                const Text(
                                  'Iniciar sesión',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.darkBlue,
                                    letterSpacing: -0.6,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Ingrese sus credenciales',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.muted,
                                  ),
                                ),
                                const SizedBox(height: 26),
                                const Text(
                                  'Usuario',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _username,
                                  enabled: !_loading,
                                  autofillHints: const [AutofillHints.username],
                                  textInputAction: TextInputAction.next,
                                  autocorrect: false,
                                  decoration: const InputDecoration(
                                    hintText: 'Ej.: 201912345',
                                    prefixIcon: Icon(
                                      Icons.person_outline,
                                      size: 19,
                                    ),
                                    fillColor: AppColors.background,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'Contraseña',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _password,
                                  enabled: !_loading,
                                  obscureText: _hidden,
                                  autofillHints: const [AutofillHints.password],
                                  textInputAction: TextInputAction.done,
                                  onSubmitted: (_) => _login(),
                                  decoration: InputDecoration(
                                    hintText: 'Ingrese su contraseña',
                                    fillColor: AppColors.background,
                                    prefixIcon: const Icon(
                                      Icons.lock_outline,
                                      size: 19,
                                    ),
                                    suffixIcon: IconButton(
                                      tooltip: _hidden
                                          ? 'Mostrar contraseña'
                                          : 'Ocultar contraseña',
                                      onPressed: () =>
                                          setState(() => _hidden = !_hidden),
                                      icon: Icon(
                                        _hidden
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        size: 19,
                                      ),
                                    ),
                                  ),
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: _loading
                                        ? null
                                        : () => _help(true),
                                    child: const Text(
                                      '¿Olvidó su contraseña?',
                                      style: TextStyle(fontSize: 11),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  height: 48,
                                  child: FilledButton(
                                    onPressed: _loading ? null : _login,
                                    style: FilledButton.styleFrom(
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    child: _loading
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Text(
                                            'Ingresar al sistema',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                const Row(
                                  children: [
                                    Expanded(child: Divider()),
                                    Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      child: Icon(
                                        Icons.shield_outlined,
                                        size: 14,
                                        color: AppColors.goldAccent,
                                      ),
                                    ),
                                    Expanded(child: Divider()),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                const Center(
                                  child: Text(
                                    'Acceso exclusivo para Bibliotecario',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ),
                                Center(
                                  child: TextButton(
                                    onPressed: () => _help(false),
                                    child: const Text(
                                      '¿Problemas de acceso? Contactar soporte',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontSize: 11),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginBackground extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [AppColors.blue, AppColors.darkBlue],
        ).createShader(Offset.zero & size),
    );
    final paint = Paint()
      ..color = AppColors.gold.withValues(alpha: 0.035)
      ..strokeWidth = 1;
    for (double x = -size.height; x < size.width + size.height; x += 28) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x - size.height * 0.18, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
