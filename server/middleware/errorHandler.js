module.exports = (err, req, res, next) => {
  const status = err.response?.status || err.status || 500;
  // Log detailed error internally
  console.error(err.stack || err);
  // Send generic message to client
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
};
