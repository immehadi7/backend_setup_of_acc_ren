import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id)
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:         user._id,
      username:   user.username,
      phone:      user.phone,
      email:      user.email,
      role:       user.role,
      avatar:     user.avatar,
      isVerified: user.isVerified,
      balance:    user.balance,
    },
  })
}

// ─── REGISTER ───────────────────────────────────
// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { username, phone, email, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
    }

    const user = await User.create({ username, phone, email, password })
    sendTokenResponse(user, 201, res)
  } catch (error) {
    next(error)
  }
}

// ─── LOGIN ──────────────────────────────────────
// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { username, phone, email, password } = req.body

    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' })
    }

    // Find user by username, phone, or email
    const query = username
      ? { username }
      : phone
      ? { phone }
      : { email }

    const user = await User.findOne(query).select('+password')

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: '账号或密码错误' })
    }

    sendTokenResponse(user, 200, res)
  } catch (error) {
    next(error)
  }
}

// ─── GET CURRENT USER ───────────────────────────
// GET /api/auth/me  (protected)
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE PROFILE ─────────────────────────────
// PUT /api/auth/me  (protected)
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email, avatar } = req.body
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, email, avatar },
      { new: true, runValidators: true }
    )
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// ─── CHANGE PASSWORD ────────────────────────────
// PUT /api/auth/password  (protected)
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select('+password')

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: '当前密码错误' })
    }

    user.password = newPassword
    await user.save()

    sendTokenResponse(user, 200, res)
  } catch (error) {
    next(error)
  }
}