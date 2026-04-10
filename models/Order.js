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
    hours: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerHour: { type: Number, required: true },
    serviceFee: { type: Number, default: 2 },
    totalAmount: { type: Number, required: true },
    buyerContact: { type: String },
    note: { type: String },
    status: {
      type: String,
      enum: [
        'pending_confirmation',
        'confirmed',
        'payment_pending',
        'manual_review_pending',
        'paid',
        'in_progress',
        'completed',
        'cancelled',
        'refunded',
        'disputed',
      ],
      default: 'pending_confirmation',
    },
    paymentMethod: {
      type: String,
      enum: ['alipay', 'wechat', 'balance', 'manual'],
      default: 'alipay',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'submitted', 'paid', 'failed', 'closed', 'refunded'],
      default: 'unpaid',
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    paymentScreenshot: { type: String },
    paidAt: { type: Date },
    confirmedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    confirmDeadline: { type: Date },
    payDeadline: { type: Date },
    disputeReason: { type: String },
    disputeResolvedAt: { type: Date },
    orderNo: { type: String, unique: true },
  },
  { timestamps: true }
)

orderSchema.pre('save', function () {
  if (!this.orderNo) {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    this.orderNo = `ZH${timestamp}${random}`
  }
})

const Order = mongoose.model('Order', orderSchema)
export default Order
