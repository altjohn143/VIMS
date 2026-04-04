// backend/services/paymongoService.js
const axios = require('axios');

class PayMongoService {
  constructor() {
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.baseURL = 'https://api.paymongo.com/v1';
    this.authToken = Buffer.from(`${this.secretKey}:`).toString('base64');
  }

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
                name: 'VIMS Payment',
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
}

module.exports = new PayMongoService();