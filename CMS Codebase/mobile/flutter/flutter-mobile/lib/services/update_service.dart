import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:open_filex/open_filex.dart';
import 'package:logger/logger.dart';

class UpdateService {
  final Dio _dio = Dio();
  final Logger _logger = Logger();

  // API endpoint for checking updates
  static const String _updateCheckUrl = 'https://kiserian-main-sda.onrender.com/api/app-version';
  static const String _apkDownloadUrl = 'https://kiserian-main-sda.onrender.com/api/download-apk';

  /// Check if an update is available
  Future<bool> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      final response = await _dio.get(_updateCheckUrl);

      if (response.statusCode == 200 && response.data != null) {
        final latestVersion = response.data['version'] as String?;
        if (latestVersion != null && latestVersion != currentVersion) {
          return true;
        }
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
    try {
      // Request storage permission
      final status = await Permission.storage.request();
      if (!status.isGranted) {
        onError('Storage permission denied');
        return;
      }
      
      // Get download directory
      final directory = await getExternalStorageDirectory();
      final apkPath = '${directory!.path}/sda-church-mobile-update.apk';
      
      // Download APK
      await _dio.download(
        _apkDownloadUrl,
        apkPath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = received / total;
            onProgress(progress);
          }
        },
        options: Options(
          receiveTimeout: const Duration(minutes: 10),
        ),
      );
      
      // Install APK
      final result = await OpenFilex.open(apkPath);
      
      if (result.type == ResultType.done) {
        onSuccess();
      } else {
        onError('Failed to open APK');
      }
    } catch (e) {
      onError('Download failed: ${e.toString()}');
    }
  }
  
  /// Get current app version
  Future<String> getCurrentVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();
    return packageInfo.version;
  }
}
