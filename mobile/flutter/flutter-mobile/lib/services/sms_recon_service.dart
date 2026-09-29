import 'dart:convert';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:another_telephony/telephony.dart';

/// M-Pesa / bank SMS listener for collectors.
///
/// Opt-in per device: a collector enables "Payment alerts" from a
/// department's Collections tab. Once enabled, incoming M-Pesa and bank
/// messages are parsed on-device per docs/specs/mpesa-sms-samples.md. A
/// payment-looking message produces a local notification and lands in the
/// pending queue — the collector then only has to Accept (pick the
/// obligation it settles) or Decline. Raw SMS bodies never leave the phone.
class SmsReconService {
  SmsReconService._();
  static final SmsReconService instance = SmsReconService._();

  static const _enabledKey = 'sms_recon_enabled';
  static const _pendingKey = 'sms_recon_pending';
  static const _channelId = 'mpesa_payments';
  static const _channelName = 'M-Pesa Payments';

  final Telephony _telephony = Telephony.instance;
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  bool _started = false;

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /// Called from main() — starts the listener only if the collector has
  /// opted in on this device.
  Future<void> init() async {
    if (_started) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_enabledKey) != true) return;
    await start();
  }

  Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) == true;
  }

  /// Enable alerts: requests SMS + notification permissions, then starts
  /// listening. Returns false if the user denies permission.
  Future<bool> enable() async {
    final granted = await _telephony.requestPhoneAndSmsPermissions;
    if (granted != true) return false;

    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, true);
    await start();
    return true;
  }

  Future<void> disable() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, false);
    _started = false;
  }

  Future<void> start() async {
    if (_started) return;
    await _initNotifications();
    _telephony.listenIncomingSms(
      onNewMessage: _onForegroundSms,
      onBackgroundMessage: smsBackgroundHandler,
      listenInBackground: true,
    );
    _started = true;
    debugPrint('[SmsRecon] listening for payment SMS');
  }

  Future<void> _initNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _notifications.initialize(
      const InitializationSettings(android: android),
      onDidReceiveNotificationResponse: (_) =>
          _openPendingScreen(),
    );
    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: 'Incoming M-Pesa/bank payments awaiting reconciliation',
      importance: Importance.high,
    );
    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  void _openPendingScreen() {
    // Lazy import avoided — router exposes a root navigator key for exactly
    // this deep-link case.
    try {
      // ignore: avoid_dynamic_calls
      _navKey?.currentState?.pushNamed('/collect-payments');
    } catch (_) {}
  }

  /// Set by main() once the router exists.
  static GlobalKey<NavigatorState>? _navKey;
  static set navigatorKey(GlobalKey<NavigatorState> key) => _navKey = key;

  // ------------------------------------------------------------------
  // Incoming messages
  // ------------------------------------------------------------------

  Future<void> _onForegroundSms(SmsMessage msg) async {
    await handleIncoming(msg);
  }

  /// Shared by foreground and background entry points.
  static Future<void> handleIncoming(SmsMessage msg) async {
    final body = msg.body ?? '';
    final address = msg.address ?? '';
    final parsed = parseSms(address, body);
    if (parsed == null) return; // not a payment message

    // Dedupe against already-pending or posted codes
    final prefs = await SharedPreferences.getInstance();
    final pending = _readPending(prefs);
    if (pending.any((p) => p['tx_code'] == parsed['tx_code'])) return;

    pending.add(parsed);
    await prefs.setString(_pendingKey, jsonEncode(pending));

    await _showNotification(parsed);
  }

  static Future<void> _showNotification(Map<String, dynamic> tx) async {
    final plugin = FlutterLocalNotificationsPlugin();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await plugin.initialize(const InitializationSettings(android: android));
    await plugin.show(
      tx['tx_code'].hashCode,
      'Payment received — KES ${tx['amount']}',
      'From ${tx['counterparty_name'] ?? 'unknown'}. Tap to reconcile.',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: tx['tx_code'],
    );
  }

  // ------------------------------------------------------------------
  // Pending queue (SharedPreferences-backed)
  // ------------------------------------------------------------------

  static List<Map<String, dynamic>> _readPending(SharedPreferences prefs) {
    final raw = prefs.getString(_pendingKey);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getPending() async {
    final prefs = await SharedPreferences.getInstance();
    return _readPending(prefs);
  }

  Future<void> removePending(String txCode) async {
    final prefs = await SharedPreferences.getInstance();
    final pending = _readPending(prefs)
        .where((p) => p['tx_code'] != txCode)
        .toList();
    await prefs.setString(_pendingKey, jsonEncode(pending));
  }

  // ------------------------------------------------------------------
  // Parser — implements docs/specs/mpesa-sms-samples.md
  // ------------------------------------------------------------------

  static const _trustedSenders = [
    'M-PESA', 'MPESA', 'MPesa', 'SAFARICOM',
    'EQUITY', 'EquityBank', 'KCB', 'KCBank', 'COOP', 'CoopBank',
    'ABSA', 'DTB', 'STANBIC', 'NCBA', 'FAMILY',
  ];

  static final _txCodeRe = RegExp(r'^([A-Z0-9]{9,12})\s+Confirmed');
  static final _receivedRe = RegExp(
      r'received\s+Ksh([\d,]+\.?\d*)\s+from\s+(.+?)\s+(\d{9,12})\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+([\d:]+\s*[AP]M)',
      caseSensitive: false);
  static final _paidToRe = RegExp(
      r'Ksh([\d,]+\.?\d*)\s+paid to\s+(.+?)\.?\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+([\d:]+\s*[AP]M)',
      caseSensitive: false);
  static final _sentToRe = RegExp(
      r'Ksh([\d,]+\.?\d*)\s+sent to\s+(.+?)\s+(\d{9,12})\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+([\d:]+\s*[AP]M)',
      caseSensitive: false);
  static final _bankRe = RegExp(
      r'KES\s?([\d,]+\.?\d*)\s+(deposited|credited)', caseSensitive: false);
  static final _reversalRe = RegExp(r'has been reversed', caseSensitive: false);

  /// Returns extracted fields, or null if the message isn't a payment.
  static Map<String, dynamic>? parseSms(String address, String body) {
    if (!_trustedSenders.any(
        (s) => address.toUpperCase().contains(s.toUpperCase()))) {
      return null;
    }
    final codeMatch = _txCodeRe.firstMatch(body);
    if (codeMatch == null) return null; // no `CODE Confirmed` → advert/OTP
    final txCode = codeMatch.group(1)!;

    double? amountOf(RegExpMatch m) =>
        double.tryParse(m.group(1)!.replaceAll(',', ''));

    final received = _receivedRe.firstMatch(body);
    if (received != null) {
      return {
        'type': 'received',
        'tx_code': txCode,
        'amount': amountOf(received),
        'counterparty_name': received.group(2)?.trim(),
        'counterparty_phone': received.group(3),
        'occurred_at': '${received.group(4)} ${received.group(5)}',
        'captured_at': DateTime.now().toIso8601String(),
      };
    }

    final sent = _sentToRe.firstMatch(body);
    if (sent != null) {
      return {
        'type': 'sent',
        'tx_code': txCode,
        'amount': amountOf(sent),
        'counterparty_name': sent.group(2)?.trim(),
        'counterparty_phone': sent.group(3),
        'occurred_at': '${sent.group(4)} ${sent.group(5)}',
        'captured_at': DateTime.now().toIso8601String(),
      };
    }

    final paidTo = _paidToRe.firstMatch(body);
    if (paidTo != null) {
      return {
        'type': 'paybill',
        'tx_code': txCode,
        'amount': amountOf(paidTo),
        'counterparty_name': paidTo.group(2)?.trim(),
        'occurred_at': '${paidTo.group(3)} ${paidTo.group(4)}',
        'captured_at': DateTime.now().toIso8601String(),
      };
    }

    final bank = _bankRe.firstMatch(body);
    if (bank != null) {
      return {
        'type': 'bank_deposit',
        'tx_code': txCode,
        'amount': amountOf(bank),
        'counterparty_name': null,
        'captured_at': DateTime.now().toIso8601String(),
      };
    }

    if (_reversalRe.hasMatch(body)) {
      return {
        'type': 'reversal',
        'tx_code': txCode,
        'captured_at': DateTime.now().toIso8601String(),
      };
    }

    return null; // unparsed — never auto-queue ambiguous messages
  }
}

/// Telephony requires a top-level/entry-point background handler.
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage msg) async {
  await SmsReconService.handleIncoming(msg);
}
