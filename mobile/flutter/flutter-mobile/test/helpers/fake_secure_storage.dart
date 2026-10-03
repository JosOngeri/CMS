// Shared mock for the flutter_secure_storage method channel.
// installFakeSecureStorage() registers it and returns the backing map so
// tests can seed/inspect stored values. Call removeFakeSecureStorage() in
// tearDown.

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const secureStorageChannel =
    MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

Map<String, String> installFakeSecureStorage() {
  final data = <String, String>{};
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(secureStorageChannel, (call) async {
    final args = call.arguments as Map? ?? {};
    final key = args['key'] as String?;
    switch (call.method) {
      case 'read':
        return data[key];
      case 'write':
        data[key!] = args['value'] as String;
        return null;
      case 'delete':
        data.remove(key);
        return null;
      case 'deleteAll':
        data.clear();
        return null;
      case 'readAll':
        return Map<String, String>.from(data);
      case 'containsKey':
        return data.containsKey(key);
      default:
        return null;
    }
  });
  return data;
}

void removeFakeSecureStorage() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(secureStorageChannel, null);
}
