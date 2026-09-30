import 'package:flutter_test/flutter_test.dart';
import 'package:sda_church_mobile/services/sms_recon_service.dart';

/// Verifies the Dart port of the pesa-track MpesaParser against the
/// reference messages in docs/specs/mpesa-sms-samples.md.
void main() {
  group('M-Pesa SMS parser', () {
    test('received personal payment', () {
      final r = SmsReconService.parseSms('M-PESA',
          'SGH41RT2KL Confirmed. You have received Ksh500.00 from JOHN KAMAU MAINA '
          '0712345678 on 16/6/25 at 2:30 PM. New M-PESA balance is Ksh12,450.75. '
          'Transaction cost, Ksh0.00. Amount you can transact within the day is 499,500.00.');
      expect(r, isNotNull);
      expect(r!['type'], 'received');
      expect(r['tx_code'], 'SGH41RT2KL');
      expect(r['amount'], 500.0);
      expect(r['counterparty_name'], 'JOHN KAMAU MAINA');
      expect(r['counterparty_phone'], '0712345678');
      expect(r['occurred_at'], '2025-06-16 14:30');
    });

    test('paybill payment', () {
      final r = SmsReconService.parseSms('M-PESA',
          'RGK29XN8PW Confirmed. Ksh1,000.00 paid to KISERIAN MAIN SDA. on 15/6/25 at '
          '10:12 AM. New M-PESA balance is Ksh340.00. Transaction cost, Ksh23.00.');
      expect(r, isNotNull);
      expect(r!['type'], 'paybill');
      expect(r['amount'], 1000.0);
      expect(r['counterparty_name'], 'KISERIAN MAIN SDA');
    });

    test('sent money (collector remittance)', () {
      final r = SmsReconService.parseSms('M-PESA',
          'QHJ88PL3NB Confirmed. Ksh5,000.00 sent to CHURCH TREASURER 0722000111 on '
          '17/6/25 at 9:05 AM. New M-PESA balance is Ksh8,100.00.');
      expect(r, isNotNull);
      expect(r!['type'], 'sent');
      expect(r['amount'], 5000.0);
      expect(r['counterparty_name'], 'CHURCH TREASURER');
      expect(r['counterparty_phone'], '0722000111');
    });

    test('bank deposit', () {
      final r = SmsReconService.parseSms('EQUITY',
          'EQ12345678 Confirmed. KES 5,000.00 deposited to Account 0123****789 on '
          '16/06/2025 at 14:22. Ref: CASH DEPOSIT. Balance: KES 45,100.00');
      expect(r, isNotNull);
      expect(r!['type'], 'bank_deposit');
      expect(r['amount'], 5000.0);
    });

    test('reversal names the original code', () {
      final r = SmsReconService.parseSms('M-PESA',
          'QGH7X2K4LM Confirmed. Your transaction SGH41RT2KL has been reversed on '
          '16/6/25 at 3:00 PM.');
      expect(r, isNotNull);
      expect(r!['type'], 'reversal');
      expect(r['reversal_of'], 'SGH41RT2KL');
    });

    test('rejects adverts and OTPs', () {
      expect(
          SmsReconService.parseSms('M-PESA',
              'Your M-PESA OTP is 4821. Do not share this code.'),
          isNull);
      expect(
          SmsReconService.parseSms('M-PESA',
              'Download My OneApp on https://saf.cx/abc123 for free'),
          isNull);
    });

    test('rejects untrusted sender addresses', () {
      expect(
          SmsReconService.parseSms('+254700000000',
              'SGH41RT2KL Confirmed. You have received Ksh500.00 from JANE DOE '
              '0712000000 on 16/6/25 at 2:30 PM.'),
          isNull);
    });

    test('rejects airtime and agent float moves', () {
      expect(
          SmsReconService.parseSms('M-PESA',
              'TGH99AA1BC Confirmed. You bought Ksh100.00 of airtime for '
              '0712345678 on 16/6/25 at 1:00 PM.'),
          isNull);
      expect(
          SmsReconService.parseSms('M-PESA',
              'TGH99AA2BC Confirmed. Give Ksh10,000.00 cash to KISERIAN AGENT '
              '12345 - AGENT NAME on 16/6/25 at 2:00 PM.'),
          isNull);
    });

    test('masked phone number still splits from name', () {
      final r = SmsReconService.parseSms('M-PESA',
          'SGH41RT2KL Confirmed. You have received Ksh500.00 from JOHN KAMAU '
          '0712***678 on 16/6/25 at 2:30 PM. New M-PESA balance is '
          'Ksh12,450.75.');
      expect(r, isNotNull);
      expect(r!['type'], 'received');
      expect(r['counterparty_name'], 'JOHN KAMAU');
      expect(r['counterparty_phone'], '0712***678');
      expect(r['balance'], 12450.75);
    });

    test('promotional suffix is truncated before parsing', () {
      final r = SmsReconService.parseSms('M-PESA',
          'SGH41RT2KL Confirmed. You have received Ksh500.00 from JOHN KAMAU '
          '0712345678 on 16/6/25 at 2:30 PM. Download My OneApp on '
          'https://saf.cx/abc123');
      expect(r, isNotNull);
      expect(r!['type'], 'received');
      expect(r['amount'], 500.0);
    });

    test('paybill account reference is captured', () {
      final r = SmsReconService.parseSms('M-PESA',
          'RGK29XN8PW Confirmed. Ksh1,000.00 paid to KISERIAN MAIN SDA for '
          'account TITHE on 15/6/25 at 10:12 AM.');
      expect(r, isNotNull);
      expect(r!['type'], 'paybill');
      expect(r['account_number'], 'TITHE');
    });

    test('pochi till payment classified as till', () {
      final r = SmsReconService.parseSms('M-PESA',
          'THK55MZ1QA Confirmed. Ksh250.00 sent to JOSEPH STORE on 14/6/25 at '
          '6:45 PM. New Pochi balance is Ksh1,200.00.');
      expect(r, isNotNull);
      expect(r!['type'], 'till');
      expect(r['balance'], 1200.0);
    });

    test('unrecognized trusted-sender message with amount is unparsed', () {
      final r = SmsReconService.parseSms('EQUITY',
          'EQ99887766 Confirmed. KES 2,000.00 debited from Account '
          '0123****789 on 16/06/2025 at 09:15.');
      expect(r, isNotNull);
      expect(r!['type'], 'unparsed');
      expect(r['amount'], 2000.0);
      expect(r['occurred_at'], '2025-06-16 09:15');
    });
  });

  group('AI-calibrated rulesets', () {
    // Mirrors applyRuleset() in department_finance.routes.js — a church
    // can calibrate a profile for a message format the built-in parser
    // doesn't know.
    final ruleset = {
      'type': 'received',
      'tx_code_regex': r'Ref[:.]\s*([A-Z0-9]{10})',
      'amount_regex': r'TZS\s?([\d,]+\.\d{2})',
      'counterparty_name_regex': r'from\s+(.*?)\s+on\s+\d',
      'version': 3,
    };
    const customSms =
        'Ref: TZA12345BC. TZS 15,000.00 received from JUMA HASSAN '
        'on 20/06/2025 at 11:00.';

    test('ruleset extracts a format the built-in parser misses', () {
      expect(SmsReconService.parseMessage(customSms), isNull);
      final r = SmsReconService.applyRuleset(ruleset, customSms);
      expect(r, isNotNull);
      expect(r!['tx_code'], 'TZA12345BC');
      expect(r['amount'], 15000.0);
      expect(r['counterparty_name'], 'JUMA HASSAN');
      expect(r['type'], 'received');
      expect(r['profile_version'], 3);
    });

    test('parseDump prefers a matching ruleset over built-in patterns', () {
      final r = SmsReconService.parseDump(customSms, rulesets: [ruleset]);
      expect(r.parsed, hasLength(1));
      expect(r.parsed.first['tx_code'], 'TZA12345BC');
      expect(r.failed, 0);
    });

    test('ruleset that cannot extract code+amount falls back to built-in', () {
      final bad = {'tx_code_regex': r'NOMATCH', 'amount_regex': r'NOMATCH'};
      const sms = 'SGH41RT2KL Confirmed. You have received Ksh500.00 from '
          'JOHN KAMAU MAINA 0712345678 on 16/6/25 at 2:30 PM.';
      final r = SmsReconService.parseDump(sms, rulesets: [bad]);
      expect(r.parsed, hasLength(1));
      expect(r.parsed.first['type'], 'received');
      expect(r.parsed.first['amount'], 500.0);
    });

    test('rulesetFromProfile handles jsonb map and json string', () {
      final asMap = SmsReconService.rulesetFromProfile({
        'version': 2,
        'ruleset': {'tx_code_regex': r'x([0-9])'},
      });
      expect(asMap!['tx_code_regex'], r'x([0-9])');
      expect(asMap['version'], 2);
      final asStr = SmsReconService.rulesetFromProfile({
        'version': 4,
        'ruleset': '{"tx_code_regex": "y([0-9])"}',
      });
      expect(asStr!['tx_code_regex'], 'y([0-9])');
      expect(SmsReconService.rulesetFromProfile(null), isNull);
      expect(SmsReconService.rulesetFromProfile({'ruleset': 42}), isNull);
    });
  });
}
