import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['alipay', 'wechat', 'manual'],
      required: true,
    },
    merchantOrderNo: {
      type: String,
      unique: true,
      required: true,
    },
    gatewayTradeNo: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'CNY',
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'paid', 'failed', 'closed', 'refunded'],
      default: 'pending',
    },
    rawCreateResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rawNotifyPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paidAt: Date,
  },
  { timestamps: true }
)

const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
