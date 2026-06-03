import multer from "multer";

const storage = multer.memoryStorage();

function createUploadValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function imageOnlyFilter(_, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(createUploadValidationError("Only image uploads are allowed"));
    return;
  }

  callback(null, true);
}

function videoOnlyFilter(_, file, callback) {
  if (!file.mimetype.startsWith("video/")) {
    callback(createUploadValidationError("Only video uploads are allowed"));
    return;
  }

  callback(null, true);
}

function chatMediaFilter(_, file, callback) {
  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
    callback(createUploadValidationError("Only image and video attachments are allowed in chat"));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const uploadVideo = multer({
  storage,
  fileFilter: videoOnlyFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

export const uploadChatMedia = multer({
  storage,
  fileFilter: chatMediaFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 4
  }
});
