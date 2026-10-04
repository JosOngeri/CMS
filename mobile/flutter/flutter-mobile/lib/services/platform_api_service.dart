import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'config.dart';
import 'platform_auth_service.dart';

// Platform-realm API client. Hits {effectiveApiUrl}/platform/* with the
// platform Bearer token (never the church token — the realms are separate).
const _secureStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

class PlatformApiException implements Exception {
  final int? statusCode;
  final String message;
  final String? code;
  PlatformApiException(this.statusCode, this.message, {this.code});
  @override
  String toString() => message;
}

class PlatformApiService {
  final Dio _dio;
  void Function()? onSessionExpired;

  PlatformApiService._(this._dio);

  static PlatformApiService? _instance;

  static PlatformApiService getInstance({void Function()? onSessionExpired}) {
    _instance ??= PlatformApiService._(
      Dio(BaseOptions(
        baseUrl: '${AppConfig.effectiveApiUrl}/platform',
        connectTimeout: AppConfig.apiTimeout,
        receiveTimeout: AppConfig.apiTimeout,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      )),
    );
    // Keep the callback current — providers rebuild but the singleton persists.
    _instance!.onSessionExpired = onSessionExpired;
    return _instance!;
  }

  /// Re-point at a new server (Settings → Server URL changes it).
  void updateBaseUrl() {
    _dio.options.baseUrl = '${AppConfig.effectiveApiUrl}/platform';
  }

  /// All endpoints return {success, data, message} — callers unwrap `data`.
  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Object? body,
  }) async {
    try {
      final token = await _secureStorage.read(key: 'platform_token');
      final res = await _dio.request(
        path,
        queryParameters: query,
        data: body,
        options: Options(
          method: method,
          headers: token != null ? {'Authorization': 'Bearer $token'} : null,
        ),
      );
      final data = res.data;
      return data is Map<String, dynamic> ? data : {'data': data};
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 && !path.startsWith('/auth/login')) {
        onSessionExpired?.call();
      }
      final body = e.response?.data;
      final map = body is Map ? body : const {};
      final msg = map['error'] ?? map['message'] ??
          'Network error — check connection and server URL';
      throw PlatformApiException(status, msg.toString(),
          code: map['code']?.toString());
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  /// Returns {token, user}. Throws PlatformApiException with code
  /// 'MFA_REQUIRED' when a TOTP code is needed (submit via `totp`).
  Future<Map<String, dynamic>> login(String email, String password, {String? totp}) async {
    final res = await _request('POST', '/auth/login',
        body: {'email': email, 'password': password, if (totp != null) 'totp': totp});
    return res['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> me() async =>
      (await _request('GET', '/auth/me'))['data'] as Map<String, dynamic>;

  Future<void> logout() => _request('POST', '/auth/logout');

  // ── Dashboard / health ────────────────────────────────────────────────

  Future<Map<String, dynamic>> getStats() async =>
      (await _request('GET', '/stats'))['data'] as Map<String, dynamic>;

  Future<Map<String, dynamic>> getHealth() async =>
      (await _request('GET', '/health'))['data'] as Map<String, dynamic>;

  Future<List<dynamic>> getActivity({int limit = 15}) async =>
      ((await _request('GET', '/activity', query: {'limit': limit}))['data']
          as Map<String, dynamic>)['data'] as List<dynamic>;

  Future<Map<String, dynamic>> getAlerts() async =>
      (await _request('GET', '/alerts'))['data'] as Map<String, dynamic>;

  // ── Tenants ───────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getTenants({String? search, String? status, int page = 1}) async =>
      (await _request('GET', '/tenants', query: {
        if (search != null && search.isNotEmpty) 'search': search,
        if (status != null) 'status': status,
        'page': page,
        'limit': 25,
      }))['data'] as Map<String, dynamic>;

  Future<Map<String, dynamic>> getTenant(String id) async =>
      (await _request('GET', '/tenants/$id'))['data'] as Map<String, dynamic>;

  Future<Map<String, dynamic>> getTenantStats(String id) async =>
      (await _request('GET', '/tenants/$id/stats'))['data'] as Map<String, dynamic>;

  Future<void> suspendTenant(String id, {String? reason}) =>
      _request('POST', '/tenants/$id/suspend', body: {if (reason != null) 'reason': reason});

  Future<void> activateTenant(String id) => _request('POST', '/tenants/$id/activate');

  // ── Payments ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getPayments({String? status, int page = 1}) async =>
      (await _request('GET', '/payments', query: {
        if (status != null) 'status': status,
        'page': page,
        'limit': 50,
      }))['data'] as Map<String, dynamic>;

  Future<List<dynamic>> getStuckPayments() async =>
      (await _request('GET', '/payments/stuck'))['data'] as List<dynamic>;

  Future<void> reconcilePayment(String id, String status, {String? note}) =>
      _request('POST', '/payments/$id/reconcile',
          body: {'status': status, if (note != null) 'note': note});

  // ── Incidents ─────────────────────────────────────────────────────────

  Future<List<dynamic>> getIncidents() async =>
      (await _request('GET', '/incidents'))['data'] as List<dynamic>;

  Future<void> createIncident({required String title, String? summary, String severity = 'medium'}) =>
      _request('POST', '/incidents',
          body: {'title': title, if (summary != null) 'summary': summary, 'severity': severity});

  Future<void> updateIncident(String id, String status, {String? summary, String? resolutionNotes}) =>
      _request('PATCH', '/incidents/$id', body: {
        'status': status,
        if (summary != null) 'summary': summary,
        if (resolutionNotes != null) 'resolutionNotes': resolutionNotes,
      });

  // ── Audit ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getAuditLogs({String? action, String? actor, int page = 1}) async =>
      (await _request('GET', '/audit-logs', query: {
        if (action != null && action.isNotEmpty) 'action': action,
        if (actor != null && actor.isNotEmpty) 'actor': actor,
        'page': page,
        'limit': 50,
      }))['data'] as Map<String, dynamic>;

  // ── Analytics ─────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getGrowth() async =>
      (await _request('GET', '/analytics/growth'))['data'] as Map<String, dynamic>;

  Future<List<dynamic>> getUsage() async =>
      (await _request('GET', '/analytics/usage'))['data'] as List<dynamic>;

  Future<List<dynamic>> getAdoption() async =>
      (await _request('GET', '/analytics/adoption'))['data'] as List<dynamic>;

  // ── Ops ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getMaintenance() async =>
      (await _request('GET', '/maintenance'))['data'] as Map<String, dynamic>;

  Future<void> setMaintenance({required bool enabled, String? message, String? endsAt}) =>
      _request('PUT', '/maintenance', body: {
        'enabled': enabled,
        if (message != null) 'message': message,
        if (endsAt != null) 'endsAt': endsAt,
      });

  Future<Map<String, dynamic>> getVersion() async =>
      (await _request('GET', '/version'))['data'] as Map<String, dynamic>;

  Future<List<dynamic>> getDeploys() async =>
      (await _request('GET', '/deploys'))['data'] as List<dynamic>;

  Future<dynamic> getAreaData(String path) async =>
      (await _request('GET', path))['data'];

  Future<Map<String, dynamic>> getPublicStatus() async {
    try {
      final response = await Dio(BaseOptions(
        baseUrl: AppConfig.effectiveApiUrl,
        connectTimeout: AppConfig.apiTimeout,
        receiveTimeout: AppConfig.apiTimeout,
      )).get('/platform/status');
      final body = response.data;
      final data = body is Map ? body['data'] : null;
      return data is Map<String, dynamic>
          ? data
          : Map<String, dynamic>.from(data is Map ? data : const {});
    } on DioException catch (e) {
      throw PlatformApiException(
        e.response?.statusCode,
        e.response?.data is Map
            ? (e.response?.data['message'] ?? 'Server is unavailable').toString()
            : 'Server is unavailable',
      );
    }
  }
}

/// Singleton wired to the platform auth provider — a 401 logs the admin
/// out of the platform section without touching the church session.
final platformApiProvider = Provider<PlatformApiService>((ref) {
  return PlatformApiService.getInstance(
    onSessionExpired: () =>
        ref.read(platformAuthProvider.notifier).sessionExpired(),
  );
});
