// Global Error Handler Middleware
// Catches all errors and sends clean responses to client

export const errorHandler = (err, req, res, next) => {
  // Log error details for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error caught by error handler:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
  } else {
    // In production, log only essential info
    console.error('❌ Error:', err.message);
  }

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors.join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large. Maximum size is 10MB';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    } else {
      message = 'File upload error';
    }
  }

  // In production, hide internal error details
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An error occurred. Please try again later.';
  }

  // Send error response
  const errorResponse = {
    success: false,
    message: message
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.error = err.message;
  }

  res.status(statusCode).json(errorResponse);
};

// Not Found Handler (404)
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export default errorHandler;
