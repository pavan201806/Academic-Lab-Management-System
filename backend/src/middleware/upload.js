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

module.exports = {
  upload,
  handleUploadError
};
