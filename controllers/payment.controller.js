import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import { createAlipayPaymentOrder, verifyAlipayNotifySignature, markPaymentPaid } from '../services/alipayPayment.service.js'
import { createWechatPaymentOrder } from '../services/wechatPayment.service.js'

export const createAlipayPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.buyer.toString() !== req.user.id) return res.status(403).json({ success: false, message: '无权限创建此支付' })
    if (!['confirmed', 'payment_pending'].includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前订单状态不能发起支付' })
    }

    const result = await createAlipayPaymentOrder({ order, userId: req.user.id })
    res.status(200).json({ success: true, payment: result.payment, paymentUrl: result.paymentUrl })
  } catch (error) {
    next(error)
  }
}

export const handleAlipayNotify = async (req, res, next) => {
  try {
    const payload = req.body || {}
    const verified = await verifyAlipayNotifySignature(payload)
    if (!verified) return res.status(400).send('fail')

    if (payload.trade_status === 'TRADE_SUCCESS' || payload.trade_status === 'TRADE_FINISHED') {
      await markPaymentPaid({
        merchantOrderNo: payload.out_trade_no,
        gatewayTradeNo: payload.trade_no,
        notifyPayload: payload,
      })
    }

    res.send('success')
  } catch (error) {
    next(error)
  }
}

export const handleAlipayReturn = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ merchantOrderNo: req.query.out_trade_no })
    const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173'
    if (!payment) {
      return res.redirect(`${clientUrl}/payment-result?status=failed`)
    }
    res.redirect(`${clientUrl}/payment-result?paymentId=${payment._id}`)
  } catch (error) {
    next(error)
  }
}

export const createWechatPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body
    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    const result = await createWechatPaymentOrder({ order })
    res.status(200).json({ success: true, ...result })
  } catch (error) {
    next(error)
  }
}

export const handleWechatNotify = async (req, res) => {
  res.status(501).json({ success: false, message: '微信支付回调接口已预留，待补充正式证书与签名校验' })
}

export const getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('orderId')
    if (!payment) return res.status(404).json({ success: false, message: '支付记录不存在' })
    const isOwner = payment.userId.toString() === req.user.id || req.user.role === 'admin'
    if (!isOwner) return res.status(403).json({ success: false, message: '无权限查看支付状态' })
    res.status(200).json({ success: true, payment })
  } catch (error) {
    next(error)
  }
}
