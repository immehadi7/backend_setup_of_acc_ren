const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || '服务器内部错误'

  if (err.name === 'CastError') {
    statusCode = 404
    message = '资源未找到'
  }

  if (err.code === 11000) {
    statusCode = 400
    const field = Object.keys(err.keyValue || {})[0]
    const labelMap = {
      username: '用户名',
      phone: '手机号',
      email: '邮箱',
      wechatOpenId: '微信账号',
      alipayUserId: '支付宝账号',
      merchantOrderNo: '商户订单号',
    }
    message = `${labelMap[field] || field} 已存在，请使用其他值`
  }

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join('，')
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Token无效'
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token已过期，请重新登录'
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[API ERROR]', err)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export default errorHandler
