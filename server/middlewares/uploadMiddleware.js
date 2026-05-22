const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base directories exist
const dirs = [
  path.join(__dirname, '../uploads/avatars'),
  path.join(__dirname, '../uploads/covers'),
  path.join(__dirname, '../uploads/songs'),
  path.join(__dirname, '../uploads/artist_requests')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to create disk storage
const createDiskStorage = (destinationSelector, filenameSelector) => {
  return multer.diskStorage({
    destination: destinationSelector,
    filename: filenameSelector || function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// 1. User Avatar upload configuration
const uploadAvatar = multer({
  storage: createDiskStorage(
    (req, file, cb) => cb(null, path.join(__dirname, '../uploads/avatars')),
    (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
  ),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên file ảnh!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 2. Playlist Cover upload configuration
const uploadPlaylistCover = multer({
  storage: createDiskStorage(
    (req, file, cb) => cb(null, path.join(__dirname, '../uploads/covers')),
    (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'playlist-' + uniqueSuffix + path.extname(file.originalname));
    }
  ),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên file ảnh!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 3. Song Audio + Cover image upload configuration (multiple fields)
const uploadSongFields = multer({
  storage: createDiskStorage((req, file, cb) => {
    if (file.fieldname === 'audioFile') {
      cb(null, path.join(__dirname, '../uploads/songs'));
    } else if (file.fieldname === 'coverImage') {
      cb(null, path.join(__dirname, '../uploads/covers'));
    } else {
      cb(new Error('Trường file không hợp lệ!'), false);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audioFile' && file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else if (file.fieldname === 'coverImage' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không hợp lệ!'), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
}).fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

// 4. Artist Request upload configuration (multiple fields)
const uploadArtistRequest = multer({
  storage: createDiskStorage(
    (req, file, cb) => cb(null, path.join(__dirname, '../uploads/artist_requests')),
    (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  ),
  fileFilter: (req, file, cb) => {
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
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

module.exports = {
  uploadAvatar,
  uploadPlaylistCover,
  uploadSongFields,
  uploadArtistRequest
};