import express from 'express'
import { getSettings, updateSettings } from '../controllers/settings.controller.js'
import { protect, authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

// Both endpoints are admin-only
router.get('/',  protect, authorize('admin'), getSettings)
router.put('/',  protect, authorize('admin'), updateSettings)

export default router
