import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';

// Custom Retry Interceptor
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final int retries;
  final List<Duration> retryDelays;

  RetryInterceptor({
    required this.dio,
    this.retries = 3,
    this.retryDelays = const [
      Duration(seconds: 1),
      Duration(seconds: 2),
      Duration(seconds: 3),
    ],
  });

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (_shouldRetry(err)) {
      final retryCount = err.requestOptions.extra['retryCount'] ?? 0;
      if (retryCount < retries) {
        final delay = retryDelays[retryCount];
        await Future.delayed(delay);
        
        final requestOptions = err.requestOptions;
        requestOptions.extra['retryCount'] = retryCount + 1;
        
        try {
          final response = await dio.fetch(requestOptions);
          return handler.resolve(response);
        } catch (e) {
          return handler.next(err);
        }
      }
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
           err.type == DioExceptionType.receiveTimeout ||
           err.type == DioExceptionType.connectionError ||
           (err.type == DioExceptionType.badResponse &&
            err.response?.statusCode != null &&
            err.response!.statusCode! >= 500);
  }
}

class ApiService {
  final Dio _dio;
  final SharedPreferences _prefs;
  
  Dio get dio => _dio;

  void updateBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
  
  ApiService._(this._dio, this._prefs);
  
  static ApiService? _instance;
  
  static Future<ApiService> getInstance() async {
    if (_instance == null) {
      final dio = Dio(BaseOptions(
        baseUrl: AppConfig.effectiveApiUrl,
        connectTimeout: AppConfig.apiTimeout,
        receiveTimeout: AppConfig.apiTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ));
      
      final prefs = await SharedPreferences.getInstance();
      
      // Add logging interceptor in development
      if (AppConfig.enableLogging && kDebugMode) {
        dio.interceptors.add(
          LogInterceptor(
            requestBody: true,
            responseBody: true,
            error: true,
          ),
        );
      }
      
      // Add retry interceptor
      dio.interceptors.add(RetryInterceptor(dio: dio));
      
      // Add auth and error handling interceptor
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) async {
            final token = prefs.getString('auth_token');
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            handler.next(options);
          },
          onError: (error, handler) async {
            // Handle 401 Unauthorized
            if (error.response?.statusCode == 401) {
              await prefs.remove('auth_token');
              await prefs.remove('user_data');
            }
            
            // Handle network errors
            if (error.type == DioExceptionType.connectionTimeout) {
              handler.reject(
                DioException(
                  requestOptions: error.requestOptions,
                  type: DioExceptionType.connectionTimeout,
                  error: 'Connection timeout. Please check your internet connection.',
                ),
              );
              return;
            }
            
            if (error.type == DioExceptionType.receiveTimeout) {
              handler.reject(
                DioException(
                  requestOptions: error.requestOptions,
                  type: DioExceptionType.receiveTimeout,
                  error: 'Server response timeout. Please try again.',
                ),
              );
              return;
            }
            
            if (error.type == DioExceptionType.connectionError) {
              handler.reject(
                DioException(
                  requestOptions: error.requestOptions,
                  type: DioExceptionType.connectionError,
                  error: 'No internet connection. Please check your network.',
                ),
              );
              return;
            }
            
            handler.next(error);
          },
        ),
      );
      
      _instance = ApiService._(dio, prefs);
    }
    return _instance!;
  }
  
  // Helper method to get error message from DioException
  String getErrorMessage(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        return 'Connection timeout. Please check your internet connection.';
      case DioExceptionType.receiveTimeout:
        return 'Server response timeout. Please try again.';
      case DioExceptionType.connectionError:
        return 'No internet connection. Please check your network.';
      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode;
        switch (statusCode) {
          case 400:
            return 'Invalid request. Please check your input.';
          case 401:
            return 'Session expired. Please login again.';
          case 403:
            return 'Access denied. You don\'t have permission.';
          case 404:
            return 'Resource not found.';
          case 500:
            return 'Server error. Please try again later.';
          case 503:
            return 'Service unavailable. Please try again later.';
          default:
            return 'Request failed with status code: $statusCode';
        }
      case DioExceptionType.cancel:
        return 'Request was cancelled.';
      case DioExceptionType.unknown:
        return 'An unknown error occurred.';
      default:
        return 'An error occurred: ${error.message}';
    }
  }

  // Authentication methods
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    try {
      debugPrint('=== API: Attempting login ===');
      debugPrint('=== API: URL: ${AppConfig.effectiveApiUrl}/auth/login ===');
      debugPrint('=== API: Identifier (username/email/phone): $identifier ===');
      
      final service = await getInstance();
      final response = await service._dio.post(
        '/auth/login',
        data: {
          'email': identifier, // Backend expects 'email' parameter
          'password': password,
        },
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );
      
      debugPrint('=== API: Login response status: ${response.statusCode} ===');
      debugPrint('=== API: Login response data: ${response.data} ===');
      
      if (response.statusCode == 200) {
        // Handle CMS ResponseHandler format
        if (response.data['success'] == true && response.data['data'] != null) {
          final responseData = response.data['data'];
          
          // Store JWT token (regular webapp token, not SMS-scoped)
          final token = responseData['accessToken'] ?? responseData['token'];
          await _prefs.setString('auth_token', token);
          
          // Store user data
          await _prefs.setString('user_data', jsonEncode(responseData['user']));
          
          debugPrint('=== API: Login successful, token stored ===');
          
          return {
            'success': true,
            'user': responseData['user'],
            'token': token,
          };
        }
        // Fallback to direct format
        return {
          'success': true,
          'user': response.data['user'],
          'token': response.data['token'] ?? response.data['accessToken'],
        };
      } else {
        debugPrint('=== API: Login failed with status ${response.statusCode} ===');
        return {
          'success': false,
          'error': response.data['message'] ?? 'Login failed',
        };
      }
    } on DioException catch (e) {
      debugPrint('=== API: Login DioException: ${e.toString()} ===');
      debugPrint('=== API: Login error type: ${e.type} ===');
      if (e.response != null) {
        debugPrint('=== API: Login error response: ${e.response?.data} ===');
        debugPrint('=== API: Login error status: ${e.response?.statusCode} ===');
      }
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      debugPrint('=== API: Login general error: ${e.toString()} ===');
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final service = await getInstance();
      final response = await service._dio.post(
        '/auth/forgot-password',
        data: {'email': email},
      );
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': response.data['message'] ?? 'Password reset email sent',
        };
      } else {
        return {
          'success': false,
          'error': response.data['message'] ?? 'Failed to send reset email',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  // Dashboard methods
  Future<Map<String, dynamic>> getDashboardData() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/mobile/dashboard');
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
        };
      } else {
        return {
          'success': false,
          'error': 'Failed to load dashboard data',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  // Payments methods
  Future<Map<String, dynamic>> initiatePayment(Map<String, dynamic> paymentData) async {
    try {
      final service = await getInstance();
      final response = await service._dio.post(
        '/payments/initiate',
        data: paymentData,
      );
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
        };
      } else {
        return {
          'success': false,
          'error': response.data['message'] ?? 'Payment initiation failed',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> getPaymentHistory() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/payments/my-payments');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'payments': response.data['payments'] ?? [],
        };
      } else {
        return {
          'success': false,
          'error': 'Failed to load payment history',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  /// Download a PDF receipt for a payment. Returns the saved file path.
  Future<Map<String, dynamic>> downloadReceiptPdf(String paymentId) async {
    try {
      final service = await getInstance();
      final response = await service._dio.get(
        '/payments/$paymentId/receipt',
        queryParameters: {'format': 'pdf'},
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200) {
        final dir = await getApplicationDocumentsDirectory();
        final filePath = '${dir.path}/receipt-$paymentId.pdf';
        final file = File(filePath);
        await file.writeAsBytes(response.data as List<int>);
        return {'success': true, 'path': filePath};
      }

      return {'success': false, 'error': 'Failed to download receipt'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Resolve a server-relative path (e.g. /uploads/avatars/x.jpg) to a full URL.
  String resolveFileUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    final base = _dio.options.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');
    return '$base$path';
  }

  /// CMS controllers wrap payloads as { success, message, data: { data: X } }.
  /// Unwrap nested 'data' envelopes until the real payload is reached.
  dynamic _unwrapData(dynamic data) {
    while (data is Map && data['data'] != null && data.length <= 2) {
      data = data['data'];
    }
    return data;
  }

  // Announcements methods
  Future<Map<String, dynamic>> getAnnouncements() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/mobile/announcements');
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
        };
      } else {
        return {
          'success': false,
          'error': 'Failed to load announcements',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  // Profile methods
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    try {
      final service = await getInstance();
      final response = await service._dio.put(
        '/auth/profile',
        data: profileData,
      );
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
        };
      } else {
        return {
          'success': false,
          'error': response.data['message'] ?? 'Profile update failed',
        };
      }
    } on DioException catch (e) {
      return {
        'success': false,
        'error': getErrorMessage(e),
      };
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
      };
    }
  }

  /// Upload a profile photo (multipart). Returns { success, avatarUrl }.
  Future<Map<String, dynamic>> uploadProfilePhoto(File photo) async {
    try {
      final service = await getInstance();
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(photo.path),
      });

      final response = await service._dio.post(
        '/auth/profile/photo',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {
          'success': true,
          'avatarUrl': response.data['data']?['avatarUrl'],
        };
      }

      return {
        'success': false,
        'error': response.data['error'] ?? 'Photo upload failed',
      };
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Fetch the digital membership card payload.
  Future<Map<String, dynamic>> getMembershipCard() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/mobile/membership-card');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {'success': true, 'data': _unwrapData(response.data['data'])};
      }

      return {
        'success': false,
        'error': response.data['message'] ?? 'Membership card unavailable',
      };
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  // Events methods
  Future<Map<String, dynamic>> getEvents() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/mobile/events');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {'success': true, 'events': _unwrapData(response.data['data']) ?? []};
      }

      return {'success': false, 'error': 'Failed to load events'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// RSVP to an event. [status] is attending|maybe|not_attending|cancelled.
  Future<Map<String, dynamic>> rsvpEvent(String eventId, String status) async {
    try {
      final service = await getInstance();
      final response = await service._dio.post(
        '/mobile/events/$eventId/rsvp',
        data: {'status': status},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {'success': true, 'data': _unwrapData(response.data['data'])};
      }

      return {
        'success': false,
        'error': response.data['error'] ?? 'Failed to record RSVP',
      };
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Departments the current user is assigned to.
  Future<Map<String, dynamic>> getMyDepartments() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/mobile/my-departments');

      if (response.statusCode == 200 && response.data['success'] == true) {
        return {'success': true, 'departments': _unwrapData(response.data['data']) ?? []};
      }

      return {'success': false, 'error': 'Failed to load departments'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Church member directory.
  Future<Map<String, dynamic>> getMembers({String? search, int page = 1, int limit = 50}) async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/members', queryParameters: {
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = _unwrapData(response.data['data']);
        return {
          'success': true,
          'members': data is List ? data : (data?['members'] ?? []),
          'pagination': data is Map ? data['pagination'] : null,
        };
      }

      return {'success': false, 'error': 'Failed to load members'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Approval requests (pending + history).
  Future<Map<String, dynamic>> getApprovals({String? status}) async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/approvals', queryParameters: {
        if (status != null && status.isNotEmpty) 'filter': status,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = _unwrapData(response.data['data']);
        return {'success': true, 'approvals': data is List ? data : (data?['approvals'] ?? [])};
      }

      return {'success': false, 'error': 'Failed to load approvals'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Approve an approval request (leaders only).
  Future<Map<String, dynamic>> approveRequest(String approvalId) async {
    try {
      final service = await getInstance();
      final response = await service._dio.put('/approvals/$approvalId/approve');
      return {'success': response.statusCode == 200 && response.data['success'] == true};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Reject an approval request (leaders only).
  Future<Map<String, dynamic>> rejectRequest(String approvalId, {String? reason}) async {
    try {
      final service = await getInstance();
      final response = await service._dio.put('/approvals/$approvalId/reject', data: {
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      });
      return {'success': response.statusCode == 200 && response.data['success'] == true};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Document library (Sabbath School quarterlies, bulletins, policies).
  Future<Map<String, dynamic>> getDocuments() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/documents');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = _unwrapData(response.data['data']);
        return {'success': true, 'documents': data is List ? data : (data?['documents'] ?? [])};
      }

      return {'success': false, 'error': 'Failed to load documents'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  /// Download a document file. Returns the saved file path.
  Future<Map<String, dynamic>> downloadDocument(String documentId, String fileName) async {
    try {
      final service = await getInstance();
      final response = await service._dio.get(
        '/documents/$documentId/download',
        options: Options(responseType: ResponseType.bytes),
      );

      if (response.statusCode == 200) {
        final dir = await getApplicationDocumentsDirectory();
        final safeName = fileName.replaceAll(RegExp(r'[^\w\.\-]'), '_');
        final filePath = '${dir.path}/$safeName';
        await File(filePath).writeAsBytes(response.data as List<int>);
        return {'success': true, 'path': filePath};
      }

      return {'success': false, 'error': 'Failed to download document'};
    } on DioException catch (e) {
      return {'success': false, 'error': getErrorMessage(e)};
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }
}