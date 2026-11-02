const path = require('path');

const uploadsDirectory = path.resolve(
  process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads')
);
const privateUploadsDirectory = path.resolve(
  process.env.PRIVATE_UPLOADS_DIR || path.resolve(__dirname, '../../private_uploads')
);

module.exports = { uploadsDirectory, privateUploadsDirectory };
