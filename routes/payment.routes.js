import express from 'express'
import {
  createAlipayPayment,
  handleAlipayNotify,
  handleAlipayReturn,
  createWechatPayment,
  handleWechatNotify,
  getPaymentStatus,
} from '../controllers/payment.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/alipay/create', protect, createAlipayPayment)
router.post('/alipay/notify', handleAlipayNotify)
router.get('/alipay/return', handleAlipayReturn)
router.post('/wechat/create', protect, createWechatPayment)
router.post('/wechat/notify', handleWechatNotify)
router.get('/:id/status', protect, getPaymentStatus)

export default router
