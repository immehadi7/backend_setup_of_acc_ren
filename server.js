import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { Server } from 'socket.io'

import connectDB from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import accountRoutes from './routes/account.routes.js'
import orderRoutes from './routes/order.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import paymentRoutes from './routes/payment.routes.js'
import errorHandler from './middleware/error.middleware.js'

connectDB()

const app = express()
const httpServer = createServer(app)

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (origin.startsWith('http://localhost')) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}

app.use(helmet())
app.use(cors(corsOptions))
app.use('/api/payments/alipay/notify', express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (origin.startsWith('http://localhost')) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
})

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '61租号 API is running ✅', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/payments', paymentRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由 ${req.originalUrl} 不存在` })
})

app.use(errorHandler)

const onlineUsers = new Map()
const chatHistory = []

const AUTO_REPLIES = [
  { keywords: ['订单', '查询', 'order'], reply: '您好！请提供您的订单号，我马上为您查询最新状态 📦' },
  { keywords: ['付款', '支付', '付钱'], reply: '收到！付款后请将截图发送给我们，我们会立即为您处理 💰' },
  { keywords: ['退款', 'refund'], reply: '了解！请提供订单号和退款原因，我们将在24小时内处理 💸' },
  { keywords: ['账号', '问题', 'bug'], reply: '非常抱歉给您带来不便！请详细描述问题，我们会立即处理 ⚡' },
  { keywords: ['价格', '多少钱'], reply: '您好！请告知游戏类型和租用时长，我为您生成专属报价 📋' },
  { keywords: ['你好', 'hello', 'hi'], reply: '您好！我是客服小安，很高兴为您服务 😊 请问有什么可以帮助您？' },
]

const getAutoReply = (message) => {
  const msg = message.toLowerCase()
  for (const { keywords, reply } of AUTO_REPLIES) {
    if (keywords.some((k) => msg.includes(k))) return reply
  }
  return '感谢您的咨询！我们的人工客服将在36秒内回复您，请稍候 😊'
}

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`)

  socket.on('user:join', (userData) => {
    onlineUsers.set(socket.id, { ...userData, socketId: socket.id, joinedAt: new Date() })
    io.emit('users:online', onlineUsers.size)
    socket.emit('chat:history', chatHistory.slice(-50))
  })

  socket.on('chat:message', (data) => {
    const user = onlineUsers.get(socket.id)
    const message = {
      id: Date.now(),
      text: data.text,
      sender: user?.username || '用户',
      role: user?.role || 'user',
      socketId: socket.id,
      time: new Date().toISOString(),
      type: 'user',
    }
    chatHistory.push(message)
    if (chatHistory.length > 100) chatHistory.shift()
    io.emit('chat:message', message)

    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        text: getAutoReply(data.text),
        sender: '客服小安',
        role: 'support',
        socketId: 'support',
        time: new Date().toISOString(),
        type: 'support',
      }
      chatHistory.push(reply)
      io.emit('chat:message', reply)
    }, 1000)
  })

  socket.on('chat:typing', (data) => {
    socket.broadcast.emit('chat:typing', { ...data, socketId: socket.id })
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id)
    io.emit('users:online', onlineUsers.size)
    console.log(`🔌 User disconnected: ${socket.id}`)
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
})
