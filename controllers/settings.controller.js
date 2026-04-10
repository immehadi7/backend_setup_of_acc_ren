import Settings from '../models/Settings.js'

// ─── Helper: mask a sensitive string (show last 4 chars only) ────
const mask = (val) => {
  if (!val || val.length < 5) return val ? '****' : ''
  return '****' + val.slice(-4)
}

// ─── Helper: sanitise output — mask all sensitive fields ─────────
const sanitiseForClient = (doc) => {
  if (!doc) return null
  const obj = doc.toObject()

  // Fields to mask
  const sensitiveFields = ['apiKey', 'appSecret', 'privateKey', 'apiV3Key']

  const maskIn = (section) => {
    if (!section) return section
    sensitiveFields.forEach(f => {
      if (section[f]) section[f] = mask(section[f])
    })
    return section
  }

  obj.sms         = maskIn(obj.sms)
  obj.wechatLogin = maskIn(obj.wechatLogin)
  obj.alipayLogin = maskIn(obj.alipayLogin)
  obj.wechatPay   = maskIn(obj.wechatPay)
  obj.alipayPay   = maskIn(obj.alipayPay)

  return obj
}

// ─── GET SETTINGS (admin only) ───────────────────────────────────
export const getSettings = async (req, res, next) => {
  try {
    // findOrCreate the singleton document
    let settings = await Settings.findOne({ _singleton: 'global' })
    if (!settings) {
      settings = await Settings.create({ _singleton: 'global' })
    }
    res.status(200).json({ success: true, settings: sanitiseForClient(settings) })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE SETTINGS (admin only) ────────────────────────────────
// The client sends only the section it updated (e.g. { sms: { ... } })
// Sensitive fields containing '****' are left unchanged (not overwritten)
export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ _singleton: 'global' })
    if (!settings) {
      settings = await Settings.create({ _singleton: 'global' })
    }

    const sections = ['sms', 'wechatLogin', 'alipayLogin', 'wechatPay', 'alipayPay']
    const sensitiveFields = ['apiKey', 'appSecret', 'privateKey', 'apiV3Key']

    sections.forEach((section) => {
      if (!req.body[section]) return
      const incoming = req.body[section]

      Object.keys(incoming).forEach((key) => {
        const val = incoming[key]
        // If the field is sensitive and the value is masked (starts with ****), skip it
        if (sensitiveFields.includes(key) && typeof val === 'string' && val.startsWith('****')) {
          return
        }
        settings[section][key] = val
      })
    })

    settings.markModified('sms')
    settings.markModified('wechatLogin')
    settings.markModified('alipayLogin')
    settings.markModified('wechatPay')
    settings.markModified('alipayPay')

    await settings.save()

    res.status(200).json({
      success: true,
      message: '设置已保存',
      settings: sanitiseForClient(settings),
    })
  } catch (error) {
    next(error)
  }
}
