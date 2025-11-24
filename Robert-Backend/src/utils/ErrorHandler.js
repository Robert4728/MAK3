class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Appwrite error
  if (err.code) {
    error.statusCode = 400;
    error.message = err.message || 'Appwrite operation failed';
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

export { ErrorHandler, handleError };