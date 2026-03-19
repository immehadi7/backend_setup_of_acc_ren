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
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// All order routes require login
router.use(protect)

router.post('/',                  createOrder)
router.get('/my',                 getMyOrders)
router.get('/seller',             getSellerOrders)
router.get('/:id',                getOrder)
router.patch('/:id/confirm',      confirmOrder)
router.patch('/:id/pay',          submitPayment)
router.patch('/:id/complete',     completeOrder)
router.patch('/:id/cancel',       cancelOrder)

export default router