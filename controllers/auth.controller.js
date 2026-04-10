import jwt       from 'jsonwebtoken'
import User      from '../models/User.js'
import PhoneVerification from '../models/PhoneVerification.js'
import { getMockSettings, getSmsSettings } from '../services/settings.service.js'
import { buildWechatAuthUrl, exchangeWechatCode } from '../services/wechatAuth.service.js'
import { buildAlipayAuthUrl, exchangeAlipayCode } from '../services/alipayAuth.service.js'
import { generateOtpCode, hashOtpCode, compareOtpCode, getOtpExpireTime } from '../utilis/otp.js'
import { sendSms } from '../services/smsbao.service.js'
import { validatePhone } from '../middleware/validate.middleware.js'

// ─── Helpers ─────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id)
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:           user._id,
      username:     user.username,
      phone:        user.phone,
      email:        user.email,
      role:         user.role,
      avatar:       user.avatar,
      isVerified:   user.isVerified,
      phoneVerified: user.phoneVerified,
      authProvider: user.authProvider,
      balance:      user.balance,
    },
  })
}

// Safe first CLIENT_URL value — handles comma-separated list
const getClientBaseUrl = () => {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173'
  return raw.split(',')[0].trim()
}

const buildOAuthRedirect = (token, provider) => {
  const base = getClientBaseUrl()
  return `${base}?token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`
}

// ─── REGISTER ────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { username, phone, email, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
    }

    const exists = await User.findOne({ username })
    if (exists) {
      return res.status(400).json({ success: false, message: '用户名已存在' })
    }

    const user = await User.create({ username, phone, email, password, authProvider: 'local' })
    sendTokenResponse(user, 201, res)
  } catch (err) {
    next(err)
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { username, phone, email, password } = req.body
    if (!password) {
      return res.status(400).json({ success: false, message: '请输入密码' })
    }

    let user = null
    if (username) user = await User.findOne({ username }).select('+password')
    else if (phone) user = await User.findOne({ phone }).select('+password')
    else if (email) user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, message: '账号不存在' })
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: `账号已被封禁：${user.banReason || '无原因'}` })
    }

    // BUG FIX #2: use bcrypt matchPassword, NOT plain text comparison
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '密码错误' })
    }

    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}

// ─── GET ME ──────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

// ─── UPDATE PROFILE ──────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email, avatar } = req.body
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, email, avatar },
      { new: true, runValidators: true }
    )
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

// ─── CHANGE PASSWORD ─────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请提供当前密码和新密码' })
    }

    const user = await User.findById(req.user.id).select('+password')
    const isMatch = await user.matchPassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '当前密码错误' })
    }

    user.password = newPassword
    await user.save()
    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}

// ─── SMS: SEND OTP CODE ──────────────────────────────────────────
export const sendPhoneCode = async (req, res, next) => {
  try {
    const { phone } = req.body
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json({ success: false, message: '请输入有效的手机号' })
    }

    // Rate limit: 60s between sends
    const recent = await PhoneVerification.findOne({ phone }).sort({ createdAt: -1 })
    if (recent) {
      const secondsAgo = (Date.now() - new Date(recent.lastSentAt).getTime()) / 1000
      if (secondsAgo < 60) {
        return res.status(429).json({
          success: false,
          message: `请等待 ${Math.ceil(60 - secondsAgo)} 秒后重试`,
        })
      }
    }

    const mock = await getMockSettings()
    const code = (mock?.enabled && mock?.sms) ? (mock.fixedOtp || '123456') : generateOtpCode()
    const codeHash = hashOtpCode(code)
    const expiresAt = getOtpExpireTime()

    await PhoneVerification.create({
      phone,
      purpose: 'login_or_register',
      codeHash,
      expiresAt,
      ip: req.ip,
    })

    await sendSms(phone, code)

    res.status(200).json({ success: true, message: '验证码已发送' })
  } catch (err) {
    next(err)
  }
}

// ─── SMS: VERIFY OTP CODE ────────────────────────────────────────
export const verifyPhoneCode = async (req, res, next) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: '请提供手机号和验证码' })
    }

    const record = await PhoneVerification
      .findOne({ phone, verified: false })
      .select('+codeHash')
      .sort({ createdAt: -1 })

    if (!record) {
      return res.status(400).json({ success: false, message: '请先发送验证码' })
    }
    if (new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: '验证码已过期，请重新发送' })
    }
    if (record.attempts >= 5) {
      return res.status(429).json({ success: false, message: '验证次数过多，请重新发送验证码' })
    }

    record.attempts += 1
    const isMatch = compareOtpCode(code, record.codeHash)
    if (!isMatch) {
      await record.save()
      return res.status(400).json({ success: false, message: '验证码错误' })
    }

    record.verified = true
    record.verifiedAt = new Date()
    await record.save()

    res.status(200).json({ success: true, message: '验证成功' })
  } catch (err) {
    next(err)
  }
}

// ─── SMS: PHONE REGISTER OR LOGIN ────────────────────────────────
export const phoneRegisterOrLogin = async (req, res, next) => {
  try {
    const { phone, code } = req.body
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: '请提供手机号和验证码' })
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: '无效手机号' })
    }

    const record = await PhoneVerification
      .findOne({ phone, verified: false })
      .select('+codeHash')
      .sort({ createdAt: -1 })

    if (!record || new Date() > record.expiresAt) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期' })
    }
    if (!compareOtpCode(code, record.codeHash)) {
      record.attempts += 1
      await record.save()
      return res.status(400).json({ success: false, message: '验证码错误' })
    }

    record.verified = true
    record.verifiedAt = new Date()
    await record.save()

    // Find or create user by phone
    let user = await User.findOne({ phone })
    if (!user) {
      // Auto-generate a unique username from phone
      const username = `用户${phone.slice(-4)}${Date.now().toString().slice(-4)}`
      user = await User.create({
        username,
        phone,
        phoneVerified: true,
        authProvider: 'phone',
      })
    } else {
      user.phoneVerified = true
      await user.save()
    }

    sendTokenResponse(user, 200, res)
  } catch (err) {
    next(err)
  }
}

// ─── WECHAT LOGIN: REDIRECT ──────────────────────────────────────
export const wechatLoginRedirect = async (req, res, next) => {
  try {
    const mock = await getMockSettings()

    if (mock?.enabled && mock?.wechat) {
      // Mock mode — create/find a mock WeChat user and redirect
      let user = await User.findOne({ wechatOpenId: mock.wechatOpenId || 'mock_wechat_openid' })
      if (!user) {
        user = await User.create({
          username: mock.wechatNickname || '微信用户',
          wechatOpenId: mock.wechatOpenId || 'mock_wechat_openid',
          authProvider: 'wechat',
        })
      }
      const token = generateToken(user._id)
      return res.redirect(buildOAuthRedirect(token, 'wechat'))
    }

    const authUrl = await buildWechatAuthUrl('login')
    res.redirect(authUrl)
  } catch (err) {
    next(err)
  }
}

// ─── WECHAT LOGIN: CALLBACK ──────────────────────────────────────
export const wechatLoginCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query
    if (!code) {
      return res.redirect(`${getClientBaseUrl()}?error=wechat_auth_failed`)
    }

    const profile = await exchangeWechatCode(code)

    let user = await User.findOne({ wechatOpenId: profile.openid })
    if (!user) {
      const username = profile.nickname || `微信用户${Date.now().toString().slice(-4)}`
      user = await User.create({
        username,
        wechatOpenId: profile.openid,
        avatar: profile.avatar || '',
        authProvider: 'wechat',
      })
    }

    const token = generateToken(user._id)
    res.redirect(buildOAuthRedirect(token, 'wechat'))
  } catch (err) {
    next(err)
  }
}

// ─── ALIPAY LOGIN: REDIRECT ──────────────────────────────────────
export const alipayLoginRedirect = async (req, res, next) => {
  try {
    const mock = await getMockSettings()

    if (mock?.enabled && mock?.alipayLogin) {
      let user = await User.findOne({ alipayUserId: mock.alipayUserId || 'mock_alipay_user' })
      if (!user) {
        user = await User.create({
          username: mock.alipayNickname || '支付宝用户',
          alipayUserId: mock.alipayUserId || 'mock_alipay_user',
          authProvider: 'alipay',
        })
      }
      const token = generateToken(user._id)
      return res.redirect(buildOAuthRedirect(token, 'alipay'))
    }

    const authUrl = await buildAlipayAuthUrl('login')
    res.redirect(authUrl)
  } catch (err) {
    next(err)
  }
}

// ─── ALIPAY LOGIN: CALLBACK ──────────────────────────────────────
export const alipayLoginCallback = async (req, res, next) => {
  try {
    const { auth_code, app_id } = req.query
    if (!auth_code) {
      return res.redirect(`${getClientBaseUrl()}?error=alipay_auth_failed`)
    }

    const profile = await exchangeAlipayCode(auth_code)

    let user = await User.findOne({ alipayUserId: profile.userId })
    if (!user) {
      const username = `支付宝用户${Date.now().toString().slice(-4)}`
      user = await User.create({
        username,
        alipayUserId: profile.userId,
        authProvider: 'alipay',
      })
    }

    const token = generateToken(user._id)
    res.redirect(buildOAuthRedirect(token, 'alipay'))
  } catch (err) {
    next(err)
  }
}

// ─── ADMIN: GET ALL USERS ────────────────────────────────────────
// BUG FIX #3: was exported as getUsers but routes import getAllUsers
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.status(200).json({ success: true, users })
  } catch (err) {
    next(err)
  }
}

// ─── ADMIN: DELETE USER ──────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    res.status(200).json({ success: true, message: '用户已删除' })
  } catch (err) {
    next(err)
  }
}

// ─── ADMIN: BAN / UNBAN USER ─────────────────────────────────────
export const banUser = async (req, res, next) => {
  try {
    const { isBanned, banReason } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned, banReason },
      { new: true }
    )
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}

// ─── ADMIN: GET USER ACTIVITY ────────────────────────────────────
export const getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' })
    res.status(200).json({ success: true, user })
  } catch (err) {
    next(err)
  }
}
