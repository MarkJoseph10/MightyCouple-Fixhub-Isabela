import { reportServerError } from "../services/errorMonitoringService.js";

export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, __) {
  const statusCode = error.statusCode || (error.name === "MulterError" ? 400 : 500);
  const message = error.name === "MulterError"
    ? (error.code === "LIMIT_FILE_SIZE"
        ? "Attachment is too large. Images and videos must be 20MB or less."
        : error.code === "LIMIT_FILE_COUNT"
          ? "You can send up to 4 attachments at a time."
          : error.message)
    : error.message;

  void reportServerError({ error, req, user: req?.user || null });

  res.status(statusCode).json({
    message: message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
}
