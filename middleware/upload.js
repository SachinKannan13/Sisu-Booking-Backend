import multer from 'multer';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Please upload a PDF, EPUB, or DOCX file.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter
});

export const uploadSingle = upload.single('book');
