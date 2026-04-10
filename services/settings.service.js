import Settings from '../models/Settings.js'

export const getGlobalSettings = async () => {
  let settings = await Settings.findOne({ _singleton: 'global' })
  if (!settings) settings = await Settings.create({ _singleton: 'global' })
  return settings
}

// Backward-compatible alias for files that import getSettings
export const getSettings = async () => {
  return getGlobalSettings()
}

export const getMockSettings = async () => {
  const settings = await getGlobalSettings()
  return settings.mock || {}
}

export const getSmsSettings = async () => {
  const settings = await getGlobalSettings()
  return settings.sms || {}
}

export const getWechatLoginSettings = async () => {
  const settings = await getGlobalSettings()
  return settings.wechatLogin || {}
}

export const getAlipayLoginSettings = async () => {
  const settings = await getGlobalSettings()
  return settings.alipayLogin || {}
}

export const getAlipayPaySettings = async () => {
  const settings = await getGlobalSettings()
  return settings.alipayPay || {}
}

export const getWechatPaySettings = async () => {
  const settings = await getGlobalSettings()
  return settings.wechatPay || {}
}