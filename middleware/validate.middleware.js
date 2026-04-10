export const validatePhone = (phone) => {
  return /^(?:\+?86)?1[3-9]\d{9}$/.test(String(phone || '').trim())
}

export const requireFields = (fields = []) => (req, res, next) => {
  const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '')
  if (missing.length) {
    return res.status(400).json({ success: false, message: `缺少参数：${missing.join('、')}` })
  }
  next()
}
