import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '用户名不能为空'],
      unique: true,
      trim: true,
      minlength: [2, '用户名至少2个字符'],
      maxlength: [20, '用户名最多20个字符'],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [6, '密码至少6位'],
      select: false,
    },
    avatar:   { type: String, default: '' },
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      default: 'user',
    },
    isVerified: { type: Boolean, default: false },
    isBanned:   { type: Boolean, default: false },
    banReason:  { type: String,  default: ''    },
    balance:    { type: Number,  default: 0     },

    // Stats
    totalOrders:   { type: Number, default: 0   },
    totalEarnings: { type: Number, default: 0   },
    rating:        { type: Number, default: 5.0 },

    // Security
    lastLogin:        { type: Date },
    lastLoginIP:      { type: String },
    loginCount:       { type: Number, default: 0 },
    activeSessionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.model('User', userSchema)
export default User