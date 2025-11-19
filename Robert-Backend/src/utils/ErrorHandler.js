const ErrorHandler = (
  message = "Internal server error",
  statusCode = 500,
  req,
  res
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: req.error || {},
  });
};

export default ErrorHandler;