import 'package:flutter/material.dart';

class AppColors {
  static const blue = Color(0xFF0F2C59);
  static const darkBlue = Color(0xFF081A36);
  static const lightBlue = Color(0xFF1A4480);
  static const gold = Color(0xFFDAC0A3);
  static const goldAccent = Color(0xFFBFA58A);
  static const background = Color(0xFFF8FAFC);
  static const text = Color(0xFF1E293B);
  static const muted = Color(0xFF64748B);
  static const border = Color(0xFFE2E8F0);
  static const availableBg = Color(0xFFDCFCE7);
  static const available = Color(0xFF15803D);
  static const borrowedBg = Color(0xFFFEF9C3);
  static const borrowed = Color(0xFFA16207);
  static const penaltyBg = Color(0xFFFEE2E2);
  static const penalty = Color(0xFFB91C1C);
}

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.blue,
      primary: AppColors.blue,
      secondary: AppColors.goldAccent,
      surface: Colors.white,
      error: AppColors.penalty,
      onSurface: AppColors.text,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.blue,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.blue,
      ),
    ),
    dividerColor: AppColors.border,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.lightBlue),
      ),
    ),
  );
}
