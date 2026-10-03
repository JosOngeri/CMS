import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class MediaService {
  final ImagePicker _imagePicker = ImagePicker();
  
  // Pick image from gallery
  Future<File?> pickImageFromGallery() async {
    try {
      // Request storage permission for Android 12 and below
      if (!await _requestStoragePermission()) {
        return null;
      }
      
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80, // Compress to 80% quality
        maxWidth: 1024, // Limit width to 1024px
        maxHeight: 1024, // Limit height to 1024px
      );
      
      if (image != null) {
        return File(image.path);
      }
      
      return null;
    } catch (e) {
      debugPrint('Error picking image from gallery: $e');
      return null;
    }
  }
  
  // Capture image from camera
  Future<File?> captureImageFromCamera() async {
    try {
      // Request camera permission
      if (!await _requestCameraPermission()) {
        return null;
      }
      
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80, // Compress to 80% quality
        maxWidth: 1024, // Limit width to 1024px
        maxHeight: 1024, // Limit height to 1024px
      );
      
      if (image != null) {
        return File(image.path);
      }
      
      return null;
    } catch (e) {
      debugPrint('Error capturing image from camera: $e');
      return null;
    }
  }
  
  // Request camera permission
  Future<bool> _requestCameraPermission() async {
    try {
      final status = await Permission.camera.request();
      return status.isGranted;
    } catch (e) {
      debugPrint('Error requesting camera permission: $e');
      return false;
    }
  }
  
  // Request storage permission
  Future<bool> _requestStoragePermission() async {
    try {
      // Android 13+ doesn't need storage permission for media
      if (await _isAndroid13OrHigher()) {
        return true;
      }
      
      final status = await Permission.storage.request();
      return status.isGranted;
    } catch (e) {
      debugPrint('Error requesting storage permission: $e');
      return false;
    }
  }
  
  // L651: real SDK check — Android 13 (API 33) introduced scoped media access
  // where READ_EXTERNAL_STORAGE is a no-op for the photo picker.
  Future<bool> _isAndroid13OrHigher() async {
    if (!Platform.isAndroid) return true; // iOS/desktop don't use this permission
    try {
      final info = await DeviceInfoPlugin().androidInfo;
      return info.version.sdkInt >= 33;
    } catch (e) {
      debugPrint('Error reading Android SDK version: $e');
      return false; // fail safe: request the legacy permission
    }
  }
  
  // Validate image file
  Future<bool> validateImageFile(File imageFile) async {
    try {
      // Check if file exists
      if (!await imageFile.exists()) {
        debugPrint('Image file does not exist');
        return false;
      }
      
      // Check file size (max 5MB)
      final fileSize = await imageFile.length();
      if (fileSize > 5 * 1024 * 1024) {
        debugPrint('Image file too large: ${fileSize} bytes');
        return false;
      }
      
      // Check file extension
      final extension = path.extension(imageFile.path).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].contains(extension)) {
        debugPrint('Invalid image file extension: $extension');
        return false;
      }
      
      return true;
    } catch (e) {
      debugPrint('Error validating image file: $e');
      return false;
    }
  }
  
  // L651: compressImage removed — it was a pass-through stub with no callers.
  // Picker-level compression (imageQuality/maxWidth) already happens at source.

  // Get image file size in human-readable format
  String getImageFileSize(File imageFile) {
    try {
      final bytes = imageFile.lengthSync();
      if (bytes < 1024) return '$bytes B';
      if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    } catch (e) {
      return 'Unknown';
    }
  }
  
  // Delete temporary image file
  Future<void> deleteTemporaryFile(File file) async {
    try {
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Error deleting temporary file: $e');
    }
  }
  
  // Save image to app directory
  Future<File?> saveImageToAppDirectory(File imageFile) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final fileName = 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final savedPath = path.join(directory.path, fileName);
      
      final savedFile = await imageFile.copy(savedPath);
      return savedFile;
    } catch (e) {
      debugPrint('Error saving image to app directory: $e');
      return null;
    }
  }
}

// Global media service instance
final mediaService = MediaService();