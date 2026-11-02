const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { privateUploadsDirectory } = require('../config/storage');

const paymentProofDirectory = path.join(privateUploadsDirectory, 'payment-proofs');
const allowedTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.pdf', 'application/pdf']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdir(paymentProofDirectory, { recursive: true }, (error) => callback(error, paymentProofDirectory));
    },
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.get(extension) === file.mimetype) return callback(null, true);
    callback(new Error('Payment proof must be a JPG, PNG, WEBP, or PDF file'));
  }
});

upload.directory = paymentProofDirectory;
module.exports = upload;
