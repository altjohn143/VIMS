const axios = require('axios');

async function queueIdentityVerification(verification) {
  const webhookUrl = process.env.AI_VERIFICATION_WEBHOOK_URL;

  if (!webhookUrl) {
    return { queued: true, mode: 'local_stub' };
  }

  await axios.post(
    webhookUrl,
    {
      verificationId: verification._id,
      userId: verification.userId,
      frontImage: verification.frontImage,
      backImage: verification.backImage,
      selfieImage: verification.selfieImage
    },
    { timeout: 15000 }
  );

  return { queued: true, mode: 'webhook' };
}

module.exports = { queueIdentityVerification };
