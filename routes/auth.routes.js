import express from 'express'
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAllUsers,
  deleteUser,
  banUser,
  getUserActivity,
} from '../controllers/auth.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/register',          register)
router.post('/login',             login)
router.get('/me',                 protect, getMe)
router.put('/me',                 protect, updateProfile)
router.put('/password',           protect, changePassword)

// Admin routes
router.get('/users',              protect, authorize('admin'), getAllUsers)
router.delete('/users/:id',       protect, authorize('admin'), deleteUser)
router.patch('/users/:id/ban',    protect, authorize('admin'), banUser)
router.get('/users/:id/activity', protect, authorize('admin'), getUserActivity)

export default router