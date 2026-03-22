import express from 'express'
import {
  createOrder,
  confirmOrder,
  submitPayment,
  completeOrder,
  cancelOrder,
  getMyOrders,
  getSellerOrders,
  getOrder,
} from '../controllers/order.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'
import Order from '../models/Order.js'

const router = express.Router()

router.use(protect)

router.post('/',              createOrder)
router.get('/my',             getMyOrders)
router.get('/seller',         getSellerOrders)
router.get('/:id',            getOrder)
router.patch('/:id/confirm',  confirmOrder)
router.patch('/:id/pay',      submitPayment)
router.patch('/:id/complete', completeOrder)
router.patch('/:id/cancel',   cancelOrder)

// ── Seller analytics ──
router.get('/seller/analytics', async (req, res, next) => {
  try {
    const orders = await Order.find({ seller: req.user.id })
      .populate('account', 'game rank emoji')
      .populate('buyer',   'username')
      .sort({ createdAt: -1 })

    const now      = new Date()
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Daily earnings for last 7 days
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(today)
      d.setDate(d.getDate() - i)
      const next  = new Date(d)
      next.setDate(next.getDate() + 1)
      const dayOrders = orders.filter(o =>
        o.status === 'completed' &&
        new Date(o.createdAt) >= d &&
        new Date(o.createdAt) < next
      )
      last7.push({
        date:     d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        earnings: dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
        orders:   dayOrders.length,
      })
    }

    // Best performing games
    const gameMap = {}
    orders.filter(o => o.status === 'completed').forEach(o => {
      const game = o.account?.game || '未知'
      if (!gameMap[game]) gameMap[game] = { earnings: 0, orders: 0 }
      gameMap[game].earnings += o.totalAmount || 0
      gameMap[game].orders   += 1
    })
    const topGames = Object.entries(gameMap)
      .map(([game, data]) => ({ game, ...data }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5)

    res.json({
      success: true,
      analytics: {
        todayEarnings: orders
          .filter(o => o.status === 'completed' && new Date(o.createdAt) >= today)
          .reduce((s, o) => s + (o.totalAmount || 0), 0),
        monthEarnings: orders
          .filter(o => o.status === 'completed' && new Date(o.createdAt) >= monthStart)
          .reduce((s, o) => s + (o.totalAmount || 0), 0),
        totalEarnings: orders
          .filter(o => o.status === 'completed')
          .reduce((s, o) => s + (o.totalAmount || 0), 0),
        totalOrders:     orders.length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        pendingOrders:   orders.filter(o => o.status === 'pending_confirmation').length,
        activeRentals:   orders.filter(o => o.status === 'in_progress').length,
        last7Days:       last7,
        topGames,
        recentOrders:    orders.slice(0, 10),
      }
    })
  } catch (err) { next(err) }
})

// Admin only
router.get('/admin/all', authorize('admin'), async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('account', 'game rank emoji')
      .populate('buyer',   'username')
      .populate('seller',  'username')
      .sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (err) { next(err) }
})

export default router