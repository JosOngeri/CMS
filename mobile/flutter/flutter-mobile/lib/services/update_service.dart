import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import 'config.dart';

class UpdateService {
  final Dio _dio = Dio();
  final Logger _logger = Logger();

  // API endpoint for checking updates
  static const String _updateCheckUrl = 'https://cms.josongeri.co.ke/api/app-version';
  static const String _apkDownloadUrl = 'https://cms.josongeri.co.ke/api/download-apk';

  /// Check if an update is available — real semver comparison against the
  /// bundled version (L650). package_info_plus isn't wired in yet, so the
  /// current version comes from AppConfig.appVersion (kept in sync with
  /// pubspec's version field).
  Future<bool> checkForUpdate() async {
    try {
      final response = await _dio.get(_updateCheckUrl);

      if (response.statusCode == 200 && response.data != null) {
        final latestVersion = response.data['version'] as String?;
        if (latestVersion == null) return false;
        return _isNewerVersion(latestVersion, await getCurrentVersion());
      }
      return false;
    } catch (e) {
      _logger.e('Update check failed: $e');
      return false;
    }
  }

  /// Semantic compare: returns true when [latest] > [current] ('1.10.0' > '1.9.0').
  bool _isNewerVersion(String latest, String current) {
    List<int> parts(String v) => v
        .split('+').first // drop build metadata
        .split('.')
        .map((p) => int.tryParse(p.replaceAll(RegExp('[^0-9]'), '')) ?? 0)
        .toList();
    final a = parts(latest);
    final b = parts(current);
    for (var i = 0; i < 3; i++) {
      final x = i < a.length ? a[i] : 0;
      final y = i < b.length ? b[i] : 0;
      if (x != y) return x > y;
    }
    return false;
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
    return AppConfig.appVersion;
  }
}
