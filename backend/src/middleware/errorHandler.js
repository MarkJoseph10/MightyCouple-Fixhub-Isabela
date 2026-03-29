export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`
  });
}

export function errorHandler(error, _, res, __) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
}

