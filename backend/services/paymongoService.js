// backend/services/paymongoService.js
const axios = require('axios');
const crypto = require('crypto');

class PayMongoService {
  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    this.baseURL = 'https://api.paymongo.com/v1';
    this.authToken = Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  // Verify webhook signature for security
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret || !signature) {
      console.log('⚠️ Webhook signature verification skipped - missing secret or signature');
      return true;
    }
    
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // Create a checkout session for GCash/PayMaya payments
  async createPaymentSession(amount, description, successUrl, cancelUrl, metadata = {}) {
    try {
      const amountInCents = Math.round(amount * 100);
      
      const response = await axios.post(
        `${this.baseURL}/checkout_sessions`,
        {
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              description: description,
              payment_method_types: ['gcash', 'paymaya'],
              line_items: [{
                currency: 'PHP',
                amount: amountInCents,
                description: description,
                name: 'VIMS Association Dues',
                quantity: 1
              }],
              success_url: successUrl,
              cancel_url: cancelUrl,
              metadata: metadata
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        sessionId: response.data.data.id,
        checkoutUrl: response.data.data.attributes.checkout_url
      };
    } catch (error) {
      console.error('Create checkout session error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }

  // Get checkout session status
  async getCheckoutSession(sessionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/checkout_sessions/${sessionId}`,
        {
          headers: {
            'Authorization': `Basic ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        data: response.data.data,
        status: response.data.data.attributes.status,
        paymentId: response.data.data.attributes.payment_intent?.id
      };
    } catch (error) {
      console.error('Get checkout session error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.detail || error.message
      };
    }
  }
}

module.exports = new PayMongoService();