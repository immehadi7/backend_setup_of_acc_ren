import Order from '../models/Order.js'
import Account from '../models/Account.js'

// ─── CREATE ORDER (inquiry) ──────────────────────
// POST /api/orders  (protected)
export const createOrder = async (req, res, next) => {
  try {
    const { accountId, hours, buyerContact, note, paymentMethod } = req.body

    // Validate account
    const account = await Account.findById(accountId)
    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }
    if (account.status === 'offline') {
      return res.status(400).json({ success: false, message: '该账号当前离线，无法租用' })
    }
    if (account.approvalStatus !== 'approved') {
      return res.status(400).json({ success: false, message: '该账号暂未开放租用' })
    }

    const pricePerHour  = account.price
    const serviceFee    = 2
    const totalAmount   = pricePerHour * hours + serviceFee

    // Seller must confirm within 15 minutes
    const confirmDeadline = new Date(Date.now() + 15 * 60 * 1000)

    const order = await Order.create({
      buyer:         req.user.id,
      seller:        account.seller,
      account:       accountId,
      hours,
      pricePerHour,
      serviceFee,
      totalAmount,
      buyerContact,
      note,
      paymentMethod: paymentMethod || 'alipay',
      confirmDeadline,
      status:        'pending_confirmation',
    })

    // Mark account as busy
    account.status = 'busy'
    await account.save({ validateBeforeSave: false })

    await order.populate([
      { path: 'account', select: 'game rank emoji price' },
      { path: 'seller',  select: 'username phone'       },
    ])

    res.status(201).json({ success: true, message: '询单成功，等待卖家确认', order })
  } catch (error) {
    next(error)
  }
}

// ─── SELLER CONFIRMS ORDER ───────────────────────
// PATCH /api/orders/:id/confirm  (protected, seller)
export const confirmOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    if (order.seller.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限确认此订单' })
    }
    if (order.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, message: '订单状态不允许此操作' })
    }

    // Buyer has 30 minutes to pay after confirmation
    order.status      = 'confirmed'
    order.confirmedAt = new Date()
    order.payDeadline = new Date(Date.now() + 30 * 60 * 1000)
    await order.save()

    res.status(200).json({ success: true, message: '已确认，等待买家付款', order })
  } catch (error) {
    next(error)
  }
}

// ─── BUYER SUBMITS PAYMENT PROOF ─────────────────
// PATCH /api/orders/:id/pay  (protected, buyer)
export const submitPayment = async (req, res, next) => {
  try {
    const { paymentScreenshot } = req.body
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限' })
    }
    if (order.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: '请等待卖家确认后再付款' })
    }

    order.status            = 'paid'
    order.paymentStatus     = 'paid'
    order.paymentScreenshot = paymentScreenshot
    order.paidAt            = new Date()
    await order.save()

    res.status(200).json({ success: true, message: '付款凭证已提交，客服正在核验', order })
  } catch (error) {
    next(error)
  }
}

// ─── COMPLETE ORDER ──────────────────────────────
// PATCH /api/orders/:id/complete  (protected)
export const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('account')

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    order.status      = 'completed'
    order.completedAt = new Date()
    await order.save()

    // Set account back to online
    if (order.account) {
      order.account.status = 'online'
      order.account.orders += 1
      await order.account.save({ validateBeforeSave: false })
    }

    res.status(200).json({ success: true, message: '订单已完成', order })
  } catch (error) {
    next(error)
  }
}

// ─── CANCEL ORDER ────────────────────────────────
// PATCH /api/orders/:id/cancel  (protected)
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('account')

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    const cancellableStatuses = ['pending_confirmation', 'confirmed']
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前订单状态无法取消' })
    }

    order.status      = 'cancelled'
    order.cancelledAt = new Date()
    await order.save()

    // Release account back to online
    if (order.account) {
      order.account.status = 'online'
      await order.account.save({ validateBeforeSave: false })
    }

    res.status(200).json({ success: true, message: '订单已取消', order })
  } catch (error) {
    next(error)
  }
}

// ─── GET MY ORDERS (buyer) ───────────────────────
// GET /api/orders/my  (protected)
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('account', 'game rank emoji price')
      .populate('seller',  'username')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, orders })
  } catch (error) {
    next(error)
  }
}

// ─── GET SELLER ORDERS ───────────────────────────
// GET /api/orders/seller  (protected)
export const getSellerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('account', 'game rank emoji')
      .populate('buyer',   'username phone')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, orders })
  } catch (error) {
    next(error)
  }
}

// ─── GET SINGLE ORDER ────────────────────────────
// GET /api/orders/:id  (protected)
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('account', 'game rank emoji price deliveryTime')
      .populate('buyer',   'username phone')
      .populate('seller',  'username phone')

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    // Only buyer, seller, or admin can view
    const isOwner =
      order.buyer._id.toString()  === req.user.id ||
      order.seller._id.toString() === req.user.id ||
      req.user.role === 'admin'

    if (!isOwner) {
      return res.status(403).json({ success: false, message: '无权限查看此订单' })
    }

    res.status(200).json({ success: true, order })
  } catch (error) {
    next(error)
  }
}