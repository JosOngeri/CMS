import 'package:dio/dio.dart';
// import 'package:package_info_plus/package_info_plus.dart';
// import 'package:path_provider/path_provider.dart';
// import 'package:permission_handler/permission_handler.dart';
// import 'package:open_filex/open_filex.dart';
import 'package:logger/logger.dart';

class UpdateService {
  final Dio _dio = Dio();
  final Logger _logger = Logger();

  // API endpoint for checking updates
  static const String _updateCheckUrl = 'https://cms.josongeri.co.ke/api/app-version';
  static const String _apkDownloadUrl = 'https://cms.josongeri.co.ke/api/download-apk';

  /// Check if an update is available
  Future<bool> checkForUpdate() async {
    try {
      // Temporarily disabled due to package compatibility
      // final packageInfo = await PackageInfo.fromPlatform();
      // final currentVersion = packageInfo.version;

      final response = await _dio.get(_updateCheckUrl);

      if (response.statusCode == 200 && response.data != null) {
        final latestVersion = response.data['version'] as String?;
        // if (latestVersion != null && latestVersion != currentVersion) {
        //   return true;
        // }
        return latestVersion != null;
      }
      return false;
    } catch (e) {
      _logger.e('Update check failed: $e');
      return false;
    }
  }
  
  /// Download and install the update
  Future<void> downloadAndInstallUpdate({
    required Function(double) onProgress,
    required Function(String) onError,
    required Function() onSuccess,
  }) async {
    // Temporarily disabled due to package compatibility
    onError('Update service temporarily disabled in this version');
  }
  
  /// Get current app version
  Future<String> getCurrentVersion() async {
    // Temporarily disabled due to package compatibility
    return '1.0.0';
  }
}
