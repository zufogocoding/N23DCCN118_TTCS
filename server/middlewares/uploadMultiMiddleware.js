const multer = require('multer');
const path = require('path');
const fs = require('fs');

const baseDir = 'uploads/artist_requests';

// Tạo thư mục nếu chưa có
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, baseDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'idCard') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('ID Card phải là file ảnh!'), false);
    }
  } else if (file.fieldname === 'demoTrack') {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Demo Track phải là file âm thanh!'), false);
    }
  } else {
    cb(new Error('Trường file không hợp lệ!'), false);
  }
};

const uploadMulti = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Giới hạn 10MB cho mỗi file (để chứa được audio)
  }
});

module.exports = uploadMulti;
