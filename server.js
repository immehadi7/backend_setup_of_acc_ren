import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import connectDB from './config/db.js'
import authRoutes    from './routes/auth.routes.js'
import accountRoutes from './routes/account.routes.js'
import orderRoutes   from './routes/order.routes.js'
import errorHandler  from './middleware/error.middleware.js'

connectDB()

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '61租号 API is running ✅',
    time: new Date().toISOString(),
  })
})

app.use('/api/auth',     authRoutes)
app.use('/api/accounts', accountRoutes)
app.use('/api/orders',   orderRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由 ${req.originalUrl} 不存在` })
})

app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV}`)
})