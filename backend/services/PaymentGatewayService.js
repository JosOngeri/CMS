const kopokopoService = require('./kopokopo');

/**
 * Payment Gateway Service
 * Gateway-agnostic facade for payment operations. Controllers call this
 * service instead of a specific provider so the gateway can be swapped
 * without touching HTTP handlers. Currently backed by KopoKopo (M-Pesa).
 */
class PaymentGatewayService {
  initiateSTKPush(paymentData) {
    return kopokopoService.initiateSTKPush(paymentData);
  }

  generatePaymentLink(paymentData) {
    return kopokopoService.generatePaymentLink(paymentData);
  }

  generateQRCode(paymentData) {
    return kopokopoService.generateQRCode(paymentData);
  }

  checkTransactionStatus(transactionId) {
    return kopokopoService.checkTransactionStatus(transactionId);
  }

  processWebhook(payload, signature) {
    return kopokopoService.processWebhook(payload, signature);
  }

  getPaymentAnalytics(startDate, endDate) {
    return kopokopoService.getPaymentAnalytics(startDate, endDate);
  }

  refundPayment(transactionId, refundData) {
    return kopokopoService.refundPayment(transactionId, refundData);
  }
}

module.exports = new PaymentGatewayService();
