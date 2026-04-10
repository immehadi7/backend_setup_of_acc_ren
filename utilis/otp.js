import crypto from 'crypto'

export const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000))

export const hashOtpCode = (code) => {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

export const compareOtpCode = (code, hash) => hashOtpCode(code) === hash

export const getOtpExpireTime = () => {
  const minutes = Number(process.env.SMS_OTP_EXPIRE_MINUTES || 5)
  return new Date(Date.now() + minutes * 60 * 1000)
}
