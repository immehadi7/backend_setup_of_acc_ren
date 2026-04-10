import { getSettings, getMockSettings } from './settings.service.js'

export const sendSms = async (phone, code) => {
  const mock = await getMockSettings()

  // ── MOCK MODE ──
  // BUG FIX #7: was settings.smsbao — correct key is settings.sms
  if (mock?.enabled && mock?.sms) {
    console.log(`📱 MOCK SMS → ${phone} | Code: ${code}`)
    return { success: true, mock: true }
  }

  // ── REAL SMSBAO ──
  const settings = await getSettings()
  const sms = settings.sms || {}

  if (!sms.username || !sms.apiKey) {
    throw Object.assign(new Error('SMSBao 未配置，请在管理后台填写用户名和 API Key'), { statusCode: 500 })
  }

  // SMSBao requires the password as MD5
  const { createHash } = await import('crypto')
  const passwordMd5 = createHash('md5').update(sms.apiKey).digest('hex')

  const signature = sms.signature ? sms.signature : ''
  const content   = `${signature}您的验证码是：${code}，5分钟内有效，请勿泄露。`
  const url = `http://api.smsbao.com/sms?u=${encodeURIComponent(sms.username)}&p=${passwordMd5}&m=${encodeURIComponent(phone)}&c=${encodeURIComponent(content)}`

  // Use native fetch (Node 18+) to avoid needing axios
  const res  = await fetch(url)
  const text = await res.text()

  const STATUS_MAP = {
    '0':  { success: true  },
    '30': { success: false, error: '密码错误' },
    '40': { success: false, error: '账号不存在' },
    '41': { success: false, error: '余额不足' },
    '42': { success: false, error: '账号被禁用' },
    '43': { success: false, error: 'IP 被限制' },
    '50': { success: false, error: '内容含有敏感词' },
    '51': { success: false, error: '手机号码错误' },
  }

  return STATUS_MAP[text.trim()] || { success: false, error: `未知错误码: ${text}` }
}
