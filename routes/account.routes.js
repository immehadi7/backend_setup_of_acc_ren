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
} from '../controllers/account.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/',    getAccounts)
router.get('/:id', getAccount)

// Protected routes (must be logged in)
router.get('/user/my',          protect, getMyAccounts)
router.post('/',                protect, createAccount)
router.put('/:id',              protect, updateAccount)
router.delete('/:id',           protect, deleteAccount)
router.patch('/:id/status',     protect, updateStatus)

// Admin only
router.patch('/:id/approve', protect, authorize('admin'), approveAccount)

export default router