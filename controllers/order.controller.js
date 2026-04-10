import Order from '../models/Order.js'
import Account from '../models/Account.js'
import Payment from '../models/Payment.js'

export const createOrder = async (req, res, next) => {
  try {
    const { accountId, hours, buyerContact, note, paymentMethod } = req.body
    const account = await Account.findById(accountId)
    if (!account) return res.status(404).json({ success: false, message: '账号不存在' })
    if (account.status === 'offline') return res.status(400).json({ success: false, message: '该账号当前离线，无法租用' })
    if (account.approvalStatus !== 'approved') return res.status(400).json({ success: false, message: '该账号暂未开放租用' })

    const normalizedHours = Math.max(Number(hours) || 1, 1)
    const pricePerHour = Number(account.price) || 0
    const serviceFee = 2
    const totalAmount = account.isFlatFee ? pricePerHour + serviceFee : pricePerHour * normalizedHours + serviceFee
    const confirmDeadline = new Date(Date.now() + 15 * 60 * 1000)

    const order = await Order.create({
      buyer: req.user.id,
      seller: account.seller,
      account: accountId,
      hours: account.isFlatFee ? 1 : normalizedHours,
      pricePerHour,
      serviceFee,
      totalAmount,
      buyerContact,
      note,
      paymentMethod: paymentMethod || 'alipay',
      confirmDeadline,
      status: 'pending_confirmation',
      paymentStatus: 'unpaid',
    })

    account.status = 'busy'
    await account.save({ validateBeforeSave: false })

    await order.populate([
      { path: 'account', select: 'game rank emoji price' },
      { path: 'seller', select: 'username phone' },
    ])

    res.status(201).json({ success: true, message: '询单成功，等待卖家确认', order })
  } catch (error) {
    next(error)
  }
}

export const confirmOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.seller.toString() !== req.user.id) return res.status(403).json({ success: false, message: '无权限确认此订单' })
    if (order.status !== 'pending_confirmation') return res.status(400).json({ success: false, message: '订单状态不允许此操作' })

    order.status = 'confirmed'
    order.confirmedAt = new Date()
    order.payDeadline = new Date(Date.now() + 30 * 60 * 1000)
    await order.save()

    res.status(200).json({ success: true, message: '已确认，等待买家付款', order })
  } catch (error) {
    next(error)
  }
}

export const submitPayment = async (req, res, next) => {
  try {
    const { paymentScreenshot } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })
    if (order.buyer.toString() !== req.user.id) return res.status(403).json({ success: false, message: '无权限' })
    if (!['confirmed', 'payment_pending'].includes(order.status)) {
      return res.status(400).json({ success: false, message: '请等待卖家确认后再提交付款' })
    }

    let payment = null
    if (order.paymentId) {
      payment = await Payment.findById(order.paymentId)
    }
    if (!payment) {
      payment = await Payment.create({
        orderId: order._id,
        userId: order.buyer,
        paymentMethod: 'manual',
        merchantOrderNo: `${order.orderNo}-manual`,
        amount: order.totalAmount,
        status: 'submitted',
        rawCreateResponse: { source: 'manual_upload' },
      })
    } else {
      payment.status = 'submitted'
      await payment.save()
    }

    order.paymentId = payment._id
    order.status = 'manual_review_pending'
    order.paymentStatus = 'submitted'
    order.paymentMethod = 'manual'
    order.paymentScreenshot = paymentScreenshot
    await order.save()

    res.status(200).json({ success: true, message: '付款凭证已提交，等待人工审核', order })
  } catch (error) {
    next(error)
  }
}

export const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('account')
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })

    order.status = 'completed'
    order.completedAt = new Date()
    await order.save()

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

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('account')
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })

    const isOwner = order.buyer.toString() === req.user.id || order.seller.toString() === req.user.id || req.user.role === 'admin'
    if (!isOwner) return res.status(403).json({ success: false, message: '无权限取消此订单' })

    const cancellableStatuses = ['pending_confirmation', 'confirmed', 'payment_pending', 'manual_review_pending']
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前订单状态无法取消' })
    }

    order.status = 'cancelled'
    order.paymentStatus = order.paymentStatus === 'paid' ? 'paid' : 'closed'
    order.cancelledAt = new Date()
    await order.save()

    if (order.account) {
      order.account.status = 'online'
      await order.account.save({ validateBeforeSave: false })
    }

    res.status(200).json({ success: true, message: '订单已取消', order })
  } catch (error) {
    next(error)
  }
}

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user.id })
      .populate('account', 'game rank emoji price')
      .populate('seller', 'username')
      .populate('paymentId')
      .sort({ createdAt: -1 })
    res.status(200).json({ success: true, orders })
  } catch (error) {
    next(error)
  }
}

export const getSellerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('account', 'game rank emoji')
      .populate('buyer', 'username phone')
      .populate('paymentId')
      .sort({ createdAt: -1 })
    res.status(200).json({ success: true, orders })
  } catch (error) {
    next(error)
  }
}

export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('account', 'game rank emoji price deliveryTime')
      .populate('buyer', 'username phone')
      .populate('seller', 'username phone')
      .populate('paymentId')

    if (!order) return res.status(404).json({ success: false, message: '订单不存在' })

    const isOwner = order.buyer._id.toString() === req.user.id || order.seller._id.toString() === req.user.id || req.user.role === 'admin'
    if (!isOwner) return res.status(403).json({ success: false, message: '无权限查看此订单' })

    res.status(200).json({ success: true, order })
  } catch (error) {
    next(error)
  }
}
