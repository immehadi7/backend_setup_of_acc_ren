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

// All order routes require login
router.use(protect)

router.post('/',              createOrder)
router.get('/my',             getMyOrders)
router.get('/seller',         getSellerOrders)
router.get('/:id',            getOrder)
router.patch('/:id/confirm',  confirmOrder)
router.patch('/:id/pay',      submitPayment)
router.patch('/:id/complete', completeOrder)
router.patch('/:id/cancel',   cancelOrder)

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