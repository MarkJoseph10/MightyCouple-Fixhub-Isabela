import multer from "multer";

const storage = multer.memoryStorage();

function imageOnlyFilter(_, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are allowed"));
    return;
  }

  callback(null, true);
}

function videoOnlyFilter(_, file, callback) {
  if (!file.mimetype.startsWith("video/")) {
    callback(new Error("Only video uploads are allowed"));
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
