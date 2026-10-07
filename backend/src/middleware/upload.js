const multer = require('multer');
const AppError = require('../utils/appError');

// Memory storage keeps file buffers in RAM, avoiding disk residue
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check MIME type or original filename extension
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/x-pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')
  ) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF files (.pdf) are allowed for experiment extraction', 400), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB maximum
  },
  fileFilter
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Uploaded PDF exceeds the maximum file size limit of 10MB', 400));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  }
  next(err);
};

const excelFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xlsx', '.xls'];
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
    'application/x-zip-compressed'
  ];

  if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only Excel spreadsheets (.xlsx, .xls) are supported for bulk enrollment', 400), false);
  }
};

const excelUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB maximum
  },
  fileFilter: excelFileFilter
});

const handleExcelUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Uploaded Excel file exceeds the maximum file size limit of 10MB', 400));
    }
    return next(new AppError(`Excel upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = {
  upload,
  handleUploadError,
  excelUpload,
  handleExcelUploadError
};

