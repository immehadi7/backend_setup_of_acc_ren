import express from 'express'
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  updateStatus,
  approveAccount,
  getMyAccounts,
  updateCommissionDeposit,
} from '../controllers/account.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'
import Account from '../models/Account.js'

const router = express.Router()

// ── Public ──
router.get('/',    getAccounts)
router.get('/:id', getAccount)

// ── Protected ──
router.get('/user/my',      protect, getMyAccounts)
router.post('/',             protect, createAccount)
router.put('/:id',           protect, updateAccount)
router.delete('/:id',        protect, deleteAccount)
router.patch('/:id/status',  protect, updateStatus)

// ✅ Commission + Deposit update
router.patch('/:id/commission-deposit', protect, updateCommissionDeposit)

// ── Admin only ──
router.patch('/:id/approve', protect, authorize('admin'), approveAccount)
router.get('/admin/all',     protect, authorize('admin'), async (req, res, next) => {
  try {
    const accounts = await Account.find()
      .populate('seller', 'username rating')
      .sort({ createdAt: -1 })
    res.json({ success: true, accounts })
  } catch (err) { next(err) }
})

export default router