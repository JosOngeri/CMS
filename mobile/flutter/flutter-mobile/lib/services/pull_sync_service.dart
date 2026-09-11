import 'dart:async';
import 'package:flutter/material.dart';

class PullSyncService {
  Timer? _pollingTimer;

  void startPolling() {
    // Placeholder: background pull sync disabled for stable release build
    debugPrint('PullSyncService: polling started');
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    debugPrint('PullSyncService: polling stopped');
  }

  void dispose() {
    stopPolling();
  }
}
