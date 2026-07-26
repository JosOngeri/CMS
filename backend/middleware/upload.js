const multer = require('multer');
const path = require('path');

// Configure storage for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

// File filter to accept only CSV and JSON files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and JSON files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

module.exports = upload;