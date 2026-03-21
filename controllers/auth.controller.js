import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })
}

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
export const login = async (req, res, next) => {
  try {
    const { username, phone, email, password } = req.body

    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' })
    }

    let user = null

    if (username) {
      user = await User.findOne({ username }).select('+password')
    } else if (phone) {
      user = await User.findOne({ phone }).select('+password')
    } else if (email) {
      user = await User.findOne({ email }).select('+password')
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '账号不存在' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '密码错误' })
    }

    sendTokenResponse(user, 200, res)
  } catch (error) {
    next(error)
  }
}

// ─── GET CURRENT USER ───────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE PROFILE ─────────────────────────────
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
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user.id).select('+password')

    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '当前密码错误' })
    }

    user.password = newPassword
    await user.save()
    sendTokenResponse(user, 200, res)
  } catch (error) {
    next(error)
  }
}

// ─── GET ALL USERS (admin only) ─────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, users })
  } catch (error) {
    next(error)
  }
}

// ─── DELETE USER (admin only) ───────────────────
export const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: '用户已删除' })
  } catch (error) {
    next(error)
  }
}


// ─── BAN / UNBAN USER (admin) ───────────────────
export const banUser = async (req, res, next) => {
  try {
    const { isBanned, banReason } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned, banReason },
      { new: true }
    )
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}

// ─── GET USER ACTIVITY (admin) ──────────────────
export const getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    res.status(200).json({ success: true, user })
  } catch (error) {
    next(error)
  }
}