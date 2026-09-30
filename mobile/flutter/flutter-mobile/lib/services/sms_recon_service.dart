import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// M-Pesa / bank SMS parser + pending queue for collectors.
///
/// The collector copies a payment SMS (M-Pesa, bank, till confirmation)
/// and pastes it into the app — a whole copied thread of several messages
/// works too. The text is parsed on-device per
/// docs/specs/mpesa-sms-samples.md, using a Dart port of the pesa-track
/// MpesaParser (github.com/JosOngeri/pesa-track `MpesaParser.kt`).
/// Parsed payments land in the pending queue; the collector then Accepts
/// (pick the obligation it settles) or Declines. Raw message text never
/// leaves the phone.
class SmsReconService {
  SmsReconService._();
  static final SmsReconService instance = SmsReconService._();

  static const _pendingKey = 'sms_recon_pending';

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

  /// Add parsed records to the pending queue, deduped on tx_code.
  /// Returns how many were newly added.
  Future<int> addPending(List<Map<String, dynamic>> records) async {
    if (records.isEmpty) return 0;
    final prefs = await SharedPreferences.getInstance();
    final pending = _readPending(prefs);
    final known = pending.map((p) => p['tx_code']).toSet();
    var added = 0;
    for (final r in records) {
      if (known.add(r['tx_code'])) {
        pending.add(r);
        added++;
      }
    }
    if (added > 0) {
      await prefs.setString(_pendingKey, jsonEncode(pending));
    }
    return added;
  }

  // ------------------------------------------------------------------
  // Bulk parsing — port of the Kotlin splitMessages / parseMpesaSms so a
  // pasted thread of several SMS parses in one go.
  // ------------------------------------------------------------------

  /// Decorative lines that appear in copied SMS threads — strip before
  /// splitting (Kotlin NOISE_PATTERNS).
  static final _noisePatterns = [
    r'^Fintech App\s*$',
    r'^saf\.cx\s*$',
    r'^Download My OneApp on https?://saf\.cx/\w+\s*$',
    r'^\s*\d{1,2}:\d{2}\s*[AP]M\s*$',
    r'^\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?.*$',
  ].map((p) => RegExp(p, caseSensitive: false)).toList();

  static final _splitRe =
      RegExp(r'[A-Z0-9]{10}\s+Confirmed', caseSensitive: false);

  /// Split pasted text into individual messages on confirmation codes.
  static List<String> splitMessages(String text) {
    final cleaned = text
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty && !_noisePatterns.any((p) => p.hasMatch(l)))
        .join('\n');
    final parts = <String>[];
    var last = 0;
    for (final m in _splitRe.allMatches(cleaned)) {
      if (m.start > last) {
        parts.add(cleaned.substring(last, m.start));
      }
      last = m.start;
    }
    parts.add(cleaned.substring(last));
    return parts
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();
  }

  /// Parse a pasted dump (one or many messages). Returns the parsed
  /// payment records and how many chunks yielded nothing useful.
  static ({List<Map<String, dynamic>> parsed, int failed}) parseDump(
      String text) {
    final parsed = <Map<String, dynamic>>[];
    var failed = 0;
    for (final msg in splitMessages(text)) {
      final r = parseMessage(msg);
      if (r != null) {
        parsed.add(r);
      } else {
        failed++;
      }
    }
    return (parsed: parsed, failed: failed);
  }

  // ------------------------------------------------------------------
  // Parser — Dart port of the pesa-track MpesaParser
  // (github.com/JosOngeri/pesa-track …/domain/parser/MpesaParser.kt).
  // Field names/types kept compatible with our reconciliation payload:
  // tx_code, amount, counterparty_name, counterparty_phone, occurred_at.
  // Classification semantics (RECEIVED/SENT/PAID/reversal_of/etc.) match
  // the Kotlin original.
  // ------------------------------------------------------------------

  static const _trustedSenders = [
    'M-PESA', 'MPESA', 'MPesa', 'SAFARICOM',
    'EQUITY', 'EquityBank', 'KCB', 'KCBank', 'COOP', 'CoopBank',
    'ABSA', 'DTB', 'STANBIC', 'NCBA', 'FAMILY',
  ];

  static final _confirmationRe =
      RegExp(r'([A-Z0-9]{10})\s+Confirmed', caseSensitive: false);
  static final _dateTimeRe = RegExp(
      r'on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+(\d{1,2}:\d{2})\s*(AM|PM)',
      caseSensitive: false);
  // Bank SMS often uses 24-hour time ("at 14:22") — M-Pesa always uses AM/PM.
  static final _dateTime24Re = RegExp(
      r'on\s+(\d{1,2}/\d{1,2}/\d{2,4})\s+at\s+(\d{1,2}:\d{2})(?!\s*[AP]M)',
      caseSensitive: false);
  static final _balanceRe = RegExp(
      r'New\s+(M-PESA|Pochi)\s+balance\s+is\s+Ksh\s?([\d,]+\.\d{2})',
      caseSensitive: false);
  static final _balanceAltRe = RegExp(
      r'(?:Your\s+M-PESA\s+balance\s+is|Balance[:.]?)\s+(?:Ksh|KES)\s?([\d,]+\.\d{2})',
      caseSensitive: false);
  static final _reversalOfRe = RegExp(
      r'(?:transaction\s+)?([A-Z0-9]{10})\s+(?:has\s+been|was)\s+reversed',
      caseSensitive: false);
  static final _wsRe = RegExp(r'\s+');

  static final _amountPatterns = [
    r'Ksh\s?([\d,]+\.\d{2})\s+sent to',
    r'received\s+Ksh\s?([\d,]+\.\d{2})\s+from',
    r'Ksh\s?([\d,]+\.\d{2})\s+paid to',
    r'Withdraw\s+Ksh\s?([\d,]+\.\d{2})\s+from',
    r'Fuliza M-PESA amount is\s+Ksh\s?([\d,]+\.\d{2})',
    r'used to fully pay.*?(\d{1,3}(?:,\d{3})*\.\d{2})',
    r'Ksh\s?([\d,]+\.\d{2})\s+from your M-PESA',
    r'bought\s+Ksh\s?([\d,]+(?:\.\d{1,2})?)\s+(?:of\s+)?airtime',
    r'Give\s+Ksh\s?([\d,]+\.\d{2})\s+cash\s+to',
    r'Ksh\s?([\d,]+\.\d{2})\s+transferred',
    r'Ksh\s?([\d,]+\.\d{2})\s+has been credited',
    r'KES\s?([\d,]+\.?\d*)\s+(?:deposited|credited)', // bank SMS variant
  ].map((p) => RegExp(p, caseSensitive: false)).toList();

  // Generic currency fallback — only tried when classification fails, so
  // it can't accidentally pick up a balance figure in a known type.
  static final _genericAmountRe =
      RegExp(r'(?:Ksh|KES)\s?([\d,]+\.?\d*)', caseSensitive: false);

  /// M-Pesa dates are d/m/yy (day first). Returns "YYYY-MM-DD HH:MM" or
  /// null on malformed input (Kotlin version raises — we null instead).
  static String? _parseDateTime(String dateStr, String timeStr, String ampm,
      {bool hour24 = false}) {
    try {
      final parts = dateStr.split('/');
      final day = int.parse(parts[0]);
      final month = int.parse(parts[1]);
      var year = int.parse(parts[2]);
      if (year < 100) year += 2000;
      final tparts = timeStr.split(':');
      var hour = int.parse(tparts[0]);
      final minute = int.parse(tparts[1]);
      if (hour24) {
        if (hour > 23) return null;
      } else if (ampm.toUpperCase() == 'PM') {
        hour = hour % 12 + 12;
      } else {
        hour %= 12; // 12 AM → 0
      }
      if (day < 1 || day > 31 || month < 1 || month > 12 || minute > 59) {
        return null;
      }
      return '${year.toString().padLeft(4, '0')}-'
          '${month.toString().padLeft(2, '0')}-'
          '${day.toString().padLeft(2, '0')} '
          '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return null;
    }
  }

  /// Split a trailing phone number from a name (handles masked variants
  /// like 0722***481). Returns [name, phone?].
  static List<String?> _splitNamePhone(String counterparty) {
    final cleaned = counterparty.trim().replaceAll(_wsRe, ' ');
    if (cleaned.isEmpty) return [cleaned, null];
    final tokens = cleaned.split(' ');
    final last = tokens.last;
    final phoneLike = RegExp(
            r'^(0\d{9}|0\d{3}\*{3}\d{3}|\+254\d{9}|\+254\d{2,3}\*{2,3}\d{3})$')
        .hasMatch(last);
    if (phoneLike) {
      return [tokens.sublist(0, tokens.length - 1).join(' ').trim(), last];
    }
    return [cleaned, null];
  }

  static String _collapseWs(String s) => s.replaceAll(_wsRe, ' ').trim();

  /// Strip promo/advert noise Safaricom appends to messages.
  static String _truncateRaw(String text) {
    const cuts = [
      r'\s*Download My OneApp on https?://\S+.*$',
      r'\s*To access your funds,\s*Dial\s*\*334#.*$',
      r'\s*To check daily charges,\s*Dial\s*\*334#.*$',
      r'\s*Dial \*234\*0#.*$',
      r'\s*saf\.cx\S*\s*$',
    ];
    var result = text.trim();
    for (final pat in cuts) {
      result = result
          .replaceAll(RegExp(pat, caseSensitive: false, dotAll: true), '')
          .trim();
    }
    return result;
  }

  static RegExpMatch? _contains(String pattern, String text) =>
      RegExp(pattern, caseSensitive: false).firstMatch(text);

  /// Types that represent money we can reconcile toward an obligation.
  static const _collectibleTypes = {
    'received', 'sent', 'paybill', 'till', 'bank_deposit', 'reversal',
    'unparsed',
  };

  /// Parse one pasted message. The sender address is not required — the
  /// collector vouches for the text by pasting it. Returns null when the
  /// text isn't a payment message.
  static Map<String, dynamic>? parseMessage(String body) =>
      _parse(_truncateRaw(body));

  /// Parse one message arriving with its sender address — used by tests
  /// and any future SMS ingestion where the sender can be verified.
  static Map<String, dynamic>? parseSms(String address, String body) {
    if (!_trustedSenders.any(
        (s) => address.toUpperCase().contains(s.toUpperCase()))) {
      return null;
    }
    return _parse(_truncateRaw(body));
  }

  /// Full port of `parseSingleMessage` + `extractCommonFields`. Returns a
  /// record with our reconciliation field names, or null for non-payment
  /// messages (adverts, OTPs, airtime, withdrawals, agent deposits).
  static Map<String, dynamic>? _parse(String t) {
    final codeMatch = _confirmationRe.firstMatch(t);
    if (codeMatch == null) return null;
    final txCode = codeMatch.group(1)!.toUpperCase();

    // --- common fields -------------------------------------------------
    double? amount;
    for (final pat in _amountPatterns) {
      final m = pat.firstMatch(t);
      if (m != null) {
        amount = double.tryParse(m.group(1)!.replaceAll(',', ''));
        break;
      }
    }
    String? occurredAt;
    final dt = _dateTimeRe.firstMatch(t);
    if (dt != null) {
      occurredAt = _parseDateTime(dt.group(1)!, dt.group(2)!, dt.group(3)!);
    } else {
      final dt24 = _dateTime24Re.firstMatch(t);
      if (dt24 != null) {
        occurredAt =
            _parseDateTime(dt24.group(1)!, dt24.group(2)!, 'AM', hour24: true);
      }
    }
    double? balance;
    final bal = _balanceRe.firstMatch(t) ?? _balanceAltRe.firstMatch(t);
    if (bal != null) {
      balance = double.tryParse(bal.group(bal.groupCount)!.replaceAll(',', ''));
    }
    String? reversalOf;
    final rev = _reversalOfRe.firstMatch(t);
    if (rev != null && rev.group(1)!.toUpperCase() != txCode) {
      reversalOf = rev.group(1)!.toUpperCase();
    }

    // --- classification (same precedence as the Kotlin parser) ---------
    String type = 'unknown';
    String? direction;
    String? counterparty;
    String? phone;
    String? account;

    if (reversalOf != null || _contains(r'has been reversed', t) != null) {
      type = 'reversal';
      direction = 'in';
      counterparty = 'Safaricom';
    } else if (_contains(r'airtime', t) != null) {
      return null; // airtime purchase — not a collection
    } else if (_contains(r'Give\s+Ksh', t) != null) {
      return null; // agent cash deposit — collector's own float, not income
    } else if (_contains(r'\btransferred\b', t) != null) {
      type = 'bank_deposit';
      final inM = _contains(
          r'transferred\s+to\s+your\s+M-PESA\s+from\s+(.*?)\s+on\s+\d', t);
      if (inM != null) {
        direction = 'in';
        counterparty = _collapseWs(inM.group(1)!.replaceAll(RegExp(r'\.$'), ''));
      } else {
        direction = 'out';
        final outM = _contains(
            r'transferred\s+(?:from\s+your\s+M-PESA\s+to|to)\s+(.*?)\s+on\s+\d',
            t);
        if (outM != null) {
          counterparty =
              _collapseWs(outM.group(1)!.replaceAll(RegExp(r'\.$'), ''));
        }
      }
    } else if (_contains(r'(?:deposited|credited)\s+to\s+(?:your\s+)?account', t) != null ||
        _contains(r'KES\s?[\d,]+\.?\d*\s+(?:deposited|credited)', t) != null) {
      // Bank SMS (spec §3e) — not covered by the Kotlin M-Pesa parser.
      type = 'bank_deposit';
      direction = 'in';
      final accM = _contains(r'account\s+([0-9*]+)', t);
      if (accM != null) account = accM.group(1);
      final refM = _contains(r'Ref[:.]\s*(.+?)(?:\.|$)', t);
      if (refM != null) counterparty = _collapseWs(refM.group(1)!);
    } else if (_contains(r'Fuliza M-PESA amount is', t) != null ||
        _contains(r'used to fully pay your outstanding Fuliza', t) != null) {
      return null; // Fuliza facility events — not payments
    } else if (_contains(r'Withdraw\s+Ksh', t) != null) {
      return null; // agent withdrawal
    } else if (_contains(r'paid to', t) != null) {
      type = 'paybill';
      direction = 'out';
      final m = _contains(
          r'paid to\s+(.*?)\.?\s+on\s+\d{1,2}/\d{1,2}/\d{2,4}', t);
      if (m != null) {
        counterparty = _collapseWs(m.group(1)!.replaceAll(RegExp(r'\.$'), ''));
      }
      // PayBill account reference: "paid to X. Account no: Y" / "for account Y"
      final accM = _contains(
          r'(?:for account|account\s+no[:.]?)\s*([A-Za-z0-9*]+)', t);
      if (accM != null) account = accM.group(1);
    } else if (_contains(r'sent to', t) != null) {
      type = 'sent';
      direction = 'out';
      // Prefer the "for account" (PayBill) variant first
      final acctM = _contains(
          r'sent to\s+(.*?)\s+for account\s+(.*?)\s+on\s+\d{1,2}/\d{1,2}/\d{2,4}',
          t);
      if (acctM != null) {
        counterparty = _collapseWs(acctM.group(1)!);
        account = _collapseWs(acctM.group(2)!);
      } else {
        final m = _contains(
            r'sent to\s+(.*?)\s+on\s+\d{1,2}/\d{1,2}/\d{2,4}', t);
        if (m != null) {
          final parts = _splitNamePhone(m.group(1)!);
          counterparty = parts[0];
          phone = parts[1];
          // "sent to <name>" with no phone / account = Pochi la Biashara
          // till payment (Kotlin: POCHI_PAYMENT, spec §3c: 'till').
          if (phone == null) type = 'till';
        }
      }
    } else if (_contains(r'You have received', t) != null) {
      direction = 'in';
      // Kotlin distinguishes POCHI_RECEIVED via "New Pochi balance" — both
      // are money in, so we keep one 'received' type for reconciliation.
      type = 'received';
      final m = _contains(
          r'from\s+(.*?)\s+on\s+\d{1,2}/\d{1,2}/\d{2,4}', t);
      if (m != null) {
        final parts = _splitNamePhone(m.group(1)!);
        counterparty = parts[0];
        phone = parts[1];
      }
    }

    // Spec §3e/§4: trusted sender with code + amount but unknown phrasing →
    // surface for manual review rather than silently dropping.
    if (type == 'unknown') {
      if (amount == null) {
        final gm = _genericAmountRe.firstMatch(t);
        if (gm != null) {
          amount = double.tryParse(gm.group(1)!.replaceAll(',', ''));
        }
      }
      if (amount == null) return null;
      type = 'unparsed';
    }
    if (!_collectibleTypes.contains(type)) return null;

    return {
      'type': type,
      'tx_code': txCode,
      'amount': amount,
      'counterparty_name': counterparty,
      'counterparty_phone': phone,
      'account_number': account,
      'occurred_at': occurredAt,
      'direction': direction,
      'balance': balance,
      if (reversalOf != null) 'reversal_of': reversalOf,
      'captured_at': DateTime.now().toIso8601String(),
    };
  }
}
