const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('../models/Payment');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vims_system';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const payments = await Payment.find({ receiptImage: { $ne: null } }).limit(50).lean();
    console.log('Payments with receiptImage:', payments.length);
    for (const p of payments) {
      const filePath = path.join(__dirname, '..', 'uploads', 'receipts', p.receiptImage);
      console.log(p._id.toString(), p.receiptImage, fs.existsSync(filePath) ? 'EXISTS' : 'MISSING');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
