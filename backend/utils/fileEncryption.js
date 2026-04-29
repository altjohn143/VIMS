// utils/fileEncryption.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// SECURITY: File encryption utilities
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

class FileEncryption {
  static encryptFile(inputPath, outputPath) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM(ALGORITHM, ENCRYPTION_KEY, iv);
    cipher.setAAD(Buffer.from('VIMS_ID_DOCUMENT'));

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);

      output.on('finish', () => {
        // Store IV and auth tag with encrypted file
        const metadata = {
          iv: iv.toString('hex'),
          authTag: cipher.getAuthTag().toString('hex')
        };
        fs.writeFileSync(`${outputPath}.meta`, JSON.stringify(metadata));
        resolve();
      });

      output.on('error', reject);
      input.on('error', reject);
    });
  }

  static decryptFile(encryptedPath, outputPath) {
    try {
      const metadata = JSON.parse(fs.readFileSync(`${encryptedPath}.meta`, 'utf8'));
      const iv = Buffer.from(metadata.iv, 'hex');
      const authTag = Buffer.from(metadata.authTag, 'hex');

      const decipher = crypto.createDecipherGCM(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAAD(Buffer.from('VIMS_ID_DOCUMENT'));
      decipher.setAuthTag(authTag);

      const input = fs.createReadStream(encryptedPath);
      const output = fs.createWriteStream(outputPath);

      return new Promise((resolve, reject) => {
        input.pipe(decipher).pipe(output);

        output.on('finish', resolve);
        output.on('error', reject);
        input.on('error', reject);
      });
    } catch (error) {
      throw new Error('Failed to decrypt file: ' + error.message);
    }
  }

  static secureDelete(filePath) {
    // Overwrite file with random data before deletion
    try {
      const stats = fs.statSync(filePath);
      const randomData = crypto.randomBytes(stats.size);
      fs.writeFileSync(filePath, randomData);
      fs.unlinkSync(filePath);
    } catch (error) {
      // If secure delete fails, at least try regular delete
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete file:', filePath, e.message);
      }
    }
  }
}

module.exports = FileEncryption;