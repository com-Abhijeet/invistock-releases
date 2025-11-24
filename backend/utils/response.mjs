export const sendResponse = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({ status: statusCode < 400, message, data });
};
