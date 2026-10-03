// Kenyan MSISDN helpers (L731).
// Accepts 2547XXXXXXXX, 2541XXXXXXXX, 07XXXXXXXX, 01XXXXXXXX —
// the old ^2547\d{8}$ regex rejected valid Airtel (2541xx) and local
// (07xx/01xx) formats, blocking those users from M-Pesa entirely.
final RegExp _kePhone = RegExp(r'^(?:254|0)[17]\d{8}$');

/// True when [input] is a valid Kenyan mobile number in either
/// international (254…) or local (0…) format.
bool isValidKenyanPhone(String input) => _kePhone.hasMatch(input.trim());

/// Normalizes to the international format Daraja expects (254XXXXXXXXX).
/// Returns null when the input isn't a valid Kenyan number.
String? normalizeKenyanPhone(String input) {
  final digits = input.trim().replaceAll(RegExp(r'[\s\-+]'), '');
  if (!_kePhone.hasMatch(digits)) return null;
  return digits.startsWith('0') ? '254${digits.substring(1)}' : digits;
}
