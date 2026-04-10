import { getAlipayPaySettings, getMockSettings } from './settings.service.js'
import Payment from '../models/Payment.js'
import Order   from '../models/Order.js'
import crypto  from 'crypto'

const normalizeKey = (key = '') => key.replace(/\\n/g, '\n').trim()

const getConfig = async () => {
  const db   = await getAlipayPaySettings()
  const mock = await getMockSettings()
  return {
    mock,
    enabled:         String(process.env.ALIPAY_PAY_ENABLED  || db.enabled    || 'false') === 'true',
    appId:           process.env.ALIPAY_PAY_APP_ID           || db.appId      || '',
    privateKey:      normalizeKey(process.env.ALIPAY_PAY_PRIVATE_KEY || db.privateKey || ''),
    alipayPublicKey: normalizeKey(process.env.ALIPAY_PAY_PUBLIC_KEY  || db.alipayPublicKey || ''),
    gatewayUrl:      process.env.ALIPAY_PAY_GATEWAY          || db.gatewayUrl || 'https://openapi.alipay.com/gateway.do',
    notifyUrl:       process.env.ALIPAY_PAY_NOTIFY_URL       || db.notifyUrl  || '',
    returnUrl:       process.env.ALIPAY_PAY_RETURN_URL       || db.returnUrl  || '',
  }
}

const signParams = (params, privateKey) => {
  const content = Object.keys(params)
    .sort()
    .filter(k => params[k] !== '' && params[k] !== undefined && params[k] !== null)
    .map(k => `${k}=${params[k]}`)
    .join('&')
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(content, 'utf8')
  return signer.sign(privateKey, 'base64')
}

// ─── CREATE ALIPAY PAYMENT ORDER ─────────────────────────────────
// Called by payment.controller.js as:
//   createAlipayPaymentOrder({ order, userId })
export const createAlipayPaymentOrder = async ({ order, userId }) => {
  const config = await getConfig()

  const merchantOrderNo = `${order.orderNo}-alipay-${Date.now()}`

  // ── MOCK MODE ──
  if (config.mock?.enabled && config.mock?.alipayPayment) {
    const payment = await Payment.create({
      orderId:         order._id,
      userId,
      paymentMethod:   'alipay',
      merchantOrderNo,
      amount:          order.totalAmount,
      status:          'pending',
      rawCreateResponse: { mock: true },
    })

    // Simulate payment success after configured delay
    const delay = (config.mock.paymentDelaySeconds || 3) * 1000
    setTimeout(async () => {
      try {
        payment.status = 'paid'
        payment.paidAt = new Date()
        payment.gatewayTradeNo = `MOCK${Date.now()}`
        await payment.save()

        await Order.findByIdAndUpdate(order._id, {
          paymentStatus: 'paid',
          paymentId: payment._id,
          status: 'in_progress',
          paidAt: new Date(),
        })
        console.log('💳 MOCK ALIPAY PAYMENT SUCCESS:', merchantOrderNo)
      } catch (e) {
        console.error('Mock payment update error:', e)
      }
    }, delay)

    return {
      payment,
      paymentUrl: `${process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173'}/orders?mock_paid=1&orderId=${order._id}`,
    }
  }

  // ── REAL MODE ──
  if (!config.appId || !config.privateKey || !config.notifyUrl) {
    throw Object.assign(new Error('支付宝支付配置不完整，请在管理后台填写 App ID、私钥和回调地址'), { statusCode: 400 })
  }

  const bizContent = {
    out_trade_no: merchantOrderNo,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: order.totalAmount.toFixed(2),
    subject:      `61租号订单 ${order.orderNo}`,
    body:         `游戏账号租用 - ${order.orderNo}`,
  }

  const params = {
    app_id:      config.appId,
    method:      'alipay.trade.page.pay',
    format:      'JSON',
    charset:     'utf-8',
    sign_type:   'RSA2',
    timestamp:   new Date().toISOString().slice(0, 19).replace('T', ' '),
    version:     '1.0',
    notify_url:  config.notifyUrl,
    return_url:  config.returnUrl,
    biz_content: JSON.stringify(bizContent),
  }
  params.sign = signParams(params, config.privateKey)

  const form = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => form.append(k, v))

  const paymentUrl = `${config.gatewayUrl}?${form.toString()}`

  const payment = await Payment.create({
    orderId:         order._id,
    userId,
    paymentMethod:   'alipay',
    merchantOrderNo,
    amount:          order.totalAmount,
    status:          'pending',
    rawCreateResponse: { params },
  })

  return { payment, paymentUrl }
}

// ─── VERIFY ALIPAY NOTIFY SIGNATURE ──────────────────────────────
// Called by payment.controller.js as:
//   verifyAlipayNotifySignature(payload)
export const verifyAlipayNotifySignature = async (payload) => {
  try {
    const config = await getConfig()

    // Mock mode — always pass
    if (config.mock?.enabled && config.mock?.alipayPayment) return true

    if (!config.alipayPublicKey || !payload.sign) return false

    const verifyParams = { ...payload }
    const sign = verifyParams.sign
    delete verifyParams.sign
    delete verifyParams.sign_type

    const content = Object.keys(verifyParams)
      .sort()
      .filter(k => verifyParams[k] !== '' && verifyParams[k] !== undefined)
      .map(k => `${k}=${verifyParams[k]}`)
      .join('&')

    const verifier = crypto.createVerify('RSA-SHA256')
    verifier.update(content, 'utf8')
    return verifier.verify(config.alipayPublicKey, sign, 'base64')
  } catch {
    return false
  }
}

// ─── MARK PAYMENT PAID ───────────────────────────────────────────
// Called by payment.controller.js as:
//   markPaymentPaid({ merchantOrderNo, gatewayTradeNo, notifyPayload })
export const markPaymentPaid = async ({ merchantOrderNo, gatewayTradeNo, notifyPayload }) => {
  const payment = await Payment.findOne({ merchantOrderNo })
  if (!payment) throw new Error(`Payment not found: ${merchantOrderNo}`)

  if (payment.status === 'paid') return payment  // idempotent

  payment.status          = 'paid'
  payment.paidAt          = new Date()
  payment.gatewayTradeNo  = gatewayTradeNo || ''
  payment.rawNotifyPayload = notifyPayload || {}
  await payment.save()

  await Order.findByIdAndUpdate(payment.orderId, {
    paymentStatus: 'paid',
    paymentId:     payment._id,
    status:        'in_progress',
    paidAt:        new Date(),
  })

  return payment
}
