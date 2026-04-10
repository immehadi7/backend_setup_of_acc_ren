import crypto from 'crypto'
import { getAlipayLoginSettings } from './settings.service.js'

const normalizeKey = (key = '') => key.replace(/\\n/g, '\n').trim()

const getConfig = async () => {
  const dbSettings = await getAlipayLoginSettings()
  return {
    enabled: String(process.env.ALIPAY_LOGIN_ENABLED || dbSettings.enabled || 'false') === 'true',
    appId: process.env.ALIPAY_APP_ID || dbSettings.appId,
    privateKey: normalizeKey(process.env.ALIPAY_PRIVATE_KEY || dbSettings.privateKey),
    alipayPublicKey: normalizeKey(process.env.ALIPAY_PUBLIC_KEY || dbSettings.alipayPublicKey),
    gatewayUrl: process.env.ALIPAY_GATEWAY_URL || dbSettings.gatewayUrl || 'https://openapi.alipay.com/gateway.do',
    redirectUri: process.env.ALIPAY_REDIRECT_URI || dbSettings.redirectUri,
  }
}

const signParams = (params, privateKey) => {
  const signContent = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signContent, 'utf8')
  signer.end()
  return signer.sign(privateKey, 'base64')
}

export const buildAlipayAuthUrl = async (state = 'login') => {
  const config = await getConfig()
  if (!config.enabled || !config.appId || !config.privateKey || !config.redirectUri) {
    throw Object.assign(new Error('支付宝登录未配置完成'), { statusCode: 400 })
  }

  const params = {
    app_id: config.appId,
    method: 'alipay.user.info.share',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    version: '1.0',
    app_auth_token: '',
    target_id: state,
    return_url: config.redirectUri,
  }

  const sign = signParams(params, config.privateKey)
  const url = new URL('https://openauth.alipay.com/oauth2/publicAppAuthorize.htm')
  url.searchParams.set('app_id', config.appId)
  url.searchParams.set('scope', 'auth_user')
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

export const exchangeAlipayCode = async (authCode) => {
  const config = await getConfig()
  if (!config.appId || !config.privateKey || !config.gatewayUrl) {
    throw Object.assign(new Error('支付宝登录配置不完整'), { statusCode: 400 })
  }

  const bizContent = {
    grant_type: 'authorization_code',
    code: authCode,
  }
  const params = {
    app_id: config.appId,
    method: 'alipay.system.oauth.token',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
  }
  params.sign = signParams(params, config.privateKey)

  const form = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => form.append(k, v))

  const tokenRes = await fetch(config.gatewayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  const tokenData = await tokenRes.json()
  const tokenBody = tokenData.alipay_system_oauth_token_response
  if (!tokenBody?.user_id) {
    throw Object.assign(new Error(tokenBody?.sub_msg || '支付宝授权失败'), { statusCode: 400 })
  }

  return {
    userId: tokenBody.user_id,
    raw: tokenData,
  }
}

export const verifyAlipayParams = async (params) => {
  const config = await getConfig()
  if (!config.alipayPublicKey || !params.sign) return false
  const verifyParams = { ...params }
  const sign = verifyParams.sign
  delete verifyParams.sign
  delete verifyParams.sign_type
  const signContent = Object.keys(verifyParams)
    .sort()
    .map((key) => `${key}=${verifyParams[key]}`)
    .join('&')
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(signContent, 'utf8')
  verifier.end()
  return verifier.verify(config.alipayPublicKey, sign, 'base64')
}