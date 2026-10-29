import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class RecursoPhotoPicker {
  final ImagePicker _picker = ImagePicker();

  Future<XFile?> pick(ImageSource source) => _picker.pickImage(
    source: source,
    maxWidth: 1600,
    maxHeight: 1600,
    imageQuality: 85,
    requestFullMetadata: false,
  );

  Future<XFile?> recover() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    final response = await _picker.retrieveLostData();
    if (response.exception != null) throw response.exception!;
    return response.files?.firstOrNull;
  }
}
