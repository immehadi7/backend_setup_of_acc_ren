import mongoose from 'mongoose'

const accountSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    game: {
      type: String,
      required: [true, '游戏名称不能为空'],
      trim: true,
    },
    rank: {
      type: String,
      required: [true, '账号段位不能为空'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['moba', 'fps', 'rpg', 'sport', 'other'],
      default: 'other',
    },
    price: {
      type: Number,
      required: [true, '租金不能为空'],
      min: [1, '租金最少1元'],
    },
    originalPrice: {
      type: Number,
    },
    deliveryTime: {
      type: Number, // minutes
      default: 15,
    },
    description: {
      type: String,
      required: [true, '账号描述不能为空'],
      maxlength: [1000, '描述最多1000字'],
    },
    tags: [{ type: String, trim: true }],
    images: [{ type: String }], // image URLs
    emoji: { type: String, default: '🎮' },

    status: {
      type: String,
      enum: ['online', 'busy', 'offline'],
      default: 'online',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String },

    contact: { type: String },
    pricingNote: { type: String },

    // Stats
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Index for fast searching
accountSchema.index({ game: 1, category: 1, status: 1 })
accountSchema.index({ approvalStatus: 1 })

const Account = mongoose.model('Account', accountSchema)
export default Account