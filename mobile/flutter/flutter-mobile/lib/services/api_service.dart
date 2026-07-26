import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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
      debugPrint('=== API: URL: ${AppConfig.effectiveApiUrl}/api/sms/auth/login ===');
      debugPrint('=== API: Identifier (username/email/phone): $identifier ===');
      
      final service = await getInstance();
      final response = await service._dio.post(
        '/api/sms/auth/login',
        data: {
          'identifier': identifier,
          'password': password,
        },
      );
      
      debugPrint('=== API: Login response status: ${response.statusCode} ===');
      debugPrint('=== API: Login response data: ${response.data} ===');
      
      if (response.statusCode == 200) {
        // Handle CMS ResponseHandler format
        if (response.data['success'] == true && response.data['data'] != null) {
          final responseData = response.data['data'];
          
          // Store SMS-scoped JWT token
          final token = responseData['token'];
          await _prefs.setString('auth_token', token);
          
          // Store organization metadata for API configuration
          final organizationMetadata = {
            'church_id': responseData['church_id'],
            'church_slug': responseData['church_slug'],
            'sync_endpoint_url': responseData['sync_endpoint_url'],
            'snapshot_interval': responseData['snapshot_interval'],
            'rolling_update_interval': responseData['rolling_update_interval'],
          };
          await _prefs.setString('organization_metadata', jsonEncode(organizationMetadata));
          
          // Store user data
          await _prefs.setString('user_data', jsonEncode(responseData['user']));
          
          return {
            'success': true,
            'user': responseData['user'],
            'token': token,
            'organization': organizationMetadata,
          };
        }
        // Fallback to direct format
        return {
          'success': true,
          'user': response.data['user'],
          'token': response.data['token'] ?? response.data['accessToken'],
          'organization': response.data['organization'],
        };
      } else {
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
      final response = await service._dio.get('/dashboard');
      
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
      final response = await service._dio.get('/payments/history');
      
      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': response.data,
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

  // Announcements methods
  Future<Map<String, dynamic>> getAnnouncements() async {
    try {
      final service = await getInstance();
      final response = await service._dio.get('/announcements');
      
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
        '/profile',
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
}