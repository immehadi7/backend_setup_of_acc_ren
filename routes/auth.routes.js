import express from 'express'
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  deleteUser,
  banUser,
  getUserActivity,
  sendPhoneCode,
  verifyPhoneCode,
  phoneRegisterOrLogin,
  wechatLoginRedirect,
  wechatLoginCallback,
  alipayLoginRedirect,
  alipayLoginCallback,
} from '../controllers/auth.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/send-code', sendPhoneCode)
router.post('/verify-code', verifyPhoneCode)
router.post('/phone-register-or-login', phoneRegisterOrLogin)
router.get('/wechat', wechatLoginRedirect)
router.get('/wechat/callback', wechatLoginCallback)
router.get('/alipay', alipayLoginRedirect)
router.get('/alipay/callback', alipayLoginCallback)

router.get('/me', protect, getMe)
router.put('/me', protect, updateProfile)
router.put('/password', protect, changePassword)

router.get('/users', protect, authorize('admin'), getAllUsers)
router.delete('/users/:id', protect, authorize('admin'), deleteUser)
router.patch('/users/:id/ban', protect, authorize('admin'), banUser)
router.get('/users/:id/activity', protect, authorize('admin'), getUserActivity)

export default router
