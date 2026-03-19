import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Protect routes — must be logged in
export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ success: false, message: '未登录，请先登录' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')

    if (!req.user) {
      return res.status(401).json({ success: false, message: '用户不存在' })
    }

    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token无效，请重新登录' })
  }
}

// Restrict to certain roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `权限不足，需要角色: ${roles.join(', ')}`,
      })
    }
    next()
  }
}