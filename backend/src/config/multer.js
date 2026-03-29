import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_, __, callback) => {
    callback(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_, file, callback) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-").toLowerCase()}`;
    callback(null, safeName);
  }
});

function fileFilter(_, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are allowed"));
    return;
  }

  callback(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
