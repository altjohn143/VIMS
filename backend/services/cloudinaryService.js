const { v2: cloudinary } = require('cloudinary');

const explicitConfig = {
  secure: true,
  ...(process.env.CLOUDINARY_CLOUD_NAME && {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
  }),
  ...(process.env.CLOUDINARY_API_KEY && {
    api_key: process.env.CLOUDINARY_API_KEY
  }),
  ...(process.env.CLOUDINARY_API_SECRET && {
    api_secret: process.env.CLOUDINARY_API_SECRET
  })
};

// CLOUDINARY_URL is read automatically by the SDK. These explicit fields add
// support for the three separate environment variables used in Render.
cloudinary.config(explicitConfig);

const ensureConfigured = () => {
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error('Cloudinary is not configured on the backend');
  }
};

const uploadOptions = (options) => ({
  resource_type: 'image',
  folder: options.folder || 'vims',
  public_id: options.publicId,
  overwrite: options.overwrite ?? true,
  invalidate: true,
  transformation: options.transformation || [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto', fetch_format: 'auto' }
  ]
});

const uploadImagePath = async (filePath, options = {}) => {
  ensureConfigured();
  return cloudinary.uploader.upload(filePath, uploadOptions(options));
};

const uploadImageBuffer = async (buffer, options = {}) => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions(options),
      (error, result) => error ? reject(error) : resolve(result)
    );
    stream.end(buffer);
  });
};

const deleteImage = async (publicId) => {
  if (!publicId) return;
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true
  });
};

module.exports = { uploadImagePath, uploadImageBuffer, deleteImage };
