import { getWechatLoginSettings } from './settings.service.js'

const getConfig = async () => {
  const dbSettings = await getWechatLoginSettings()
  return {
    enabled: String(process.env.WECHAT_LOGIN_ENABLED || dbSettings.enabled || 'false') === 'true',
    appId: process.env.WECHAT_APP_ID || dbSettings.appId,
    appSecret: process.env.WECHAT_APP_SECRET || dbSettings.appSecret,
    redirectUri: process.env.WECHAT_REDIRECT_URI || dbSettings.redirectUri,
  }
}

export const buildWechatAuthUrl = async (state = 'login') => {
  const config = await getConfig()
  if (!config.enabled || !config.appId || !config.redirectUri) {
    throw Object.assign(new Error('微信登录未配置完成'), { statusCode: 400 })
  }

  return `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(config.appId)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=snsapi_login&state=${encodeURIComponent(state)}#wechat_redirect`
}

export const exchangeWechatCode = async (code) => {
  const config = await getConfig()
  if (!config.appId || !config.appSecret) {
    throw Object.assign(new Error('微信登录配置缺少 appId 或 appSecret'), { statusCode: 400 })
  }

  const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${encodeURIComponent(config.appId)}&secret=${encodeURIComponent(config.appSecret)}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()
  if (tokenData.errcode) {
    throw Object.assign(new Error(tokenData.errmsg || '微信授权失败'), { statusCode: 400 })
  }

  let profile = null
  if (tokenData.access_token && tokenData.openid) {
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${encodeURIComponent(tokenData.access_token)}&openid=${encodeURIComponent(tokenData.openid)}&lang=zh_CN`
    const userRes = await fetch(userInfoUrl)
    profile = await userRes.json()
  }

  return {
    openid: tokenData.openid,
    unionid: tokenData.unionid,
    nickname: profile?.nickname || '',
    avatar: profile?.headimgurl || '',
    raw: { tokenData, profile },
  }
}
