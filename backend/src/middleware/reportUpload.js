const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { privateUploadsDirectory } = require('../config/storage');

const reportFilesDirectory = path.join(privateUploadsDirectory, 'reports');
const allowedTypes = new Map([
  ['.jpg', new Set(['image/jpeg'])],
  ['.jpeg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.webp', new Set(['image/webp'])],
  ['.pdf', new Set(['application/pdf'])],
  ['.xls', new Set(['application/vnd.ms-excel', 'application/octet-stream'])],
  ['.xlsx', new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'])]
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdir(reportFilesDirectory, { recursive: true }, (error) => callback(error, reportFilesDirectory));
  },
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const reportUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.get(extension)?.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Attachments must be JPG, PNG, WEBP, PDF, XLS, or XLSX files with a matching file type'));
    }
  }
});

reportUpload.directory = reportFilesDirectory;

module.exports = reportUpload;