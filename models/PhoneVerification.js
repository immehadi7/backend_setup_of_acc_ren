import mongoose from 'mongoose'

const phoneVerificationSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'register', 'login_or_register'],
      default: 'login_or_register',
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    ip: String,
  },
  { timestamps: true }
)

phoneVerificationSchema.index({ phone: 1, purpose: 1, createdAt: -1 })

const PhoneVerification = mongoose.model('PhoneVerification', phoneVerificationSchema)
export default PhoneVerification
