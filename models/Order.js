import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // Rental details
    hours: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerHour: { type: Number, required: true },
    serviceFee: { type: Number, default: 2 },
    totalAmount: { type: Number, required: true },

    // Buyer contact
    buyerContact: { type: String },
    note: { type: String },

    // Order flow status
    status: {
      type: String,
      enum: [
        'pending_confirmation', // waiting seller to confirm
        'confirmed',            // seller confirmed, waiting payment
        'paid',                 // buyer paid
        'in_progress',          // rental started
        'completed',            // rental done
        'cancelled',            // cancelled
        'refunded',             // refunded
        'disputed',             // under dispute
      ],
      default: 'pending_confirmation',
    },

    // Payment
    paymentMethod: {
      type: String,
      enum: ['alipay', 'wechat', 'balance'],
      default: 'alipay',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentScreenshot: { type: String }, // URL of payment proof image
    paidAt: { type: Date },

    // Timestamps
    confirmedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },

    // Seller confirms within this time (minutes)
    confirmDeadline: { type: Date },
    // Buyer pays within this time
    payDeadline: { type: Date },

    // Dispute
    disputeReason: { type: String },
    disputeResolvedAt: { type: Date },

    // Order number (human-readable)
    orderNo: { type: String, unique: true },
  },
  { timestamps: true }
)

// Auto-generate order number before saving
orderSchema.pre('save', function (next) {
  if (!this.orderNo) {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    this.orderNo = `ZH${timestamp}${random}`
  }
  next()
})

const Order = mongoose.model('Order', orderSchema)
export default Order