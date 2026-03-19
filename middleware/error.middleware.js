// Global error handler — always add as LAST middleware in server.js
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || '服务器内部错误'

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404
    message = '资源未找到'
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue)[0]
    message = `${field} 已存在，请使用其他值`
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join(', ')
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Token无效'
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token已过期，请重新登录'
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler