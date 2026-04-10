import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema(
  {
    _singleton: {
      type: String,
      default: 'global',
      unique: true,
      index: true,
    },

    mock: {
      enabled: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      wechat: { type: Boolean, default: true },
      alipayLogin: { type: Boolean, default: true },
      alipayPayment: { type: Boolean, default: true },

      fixedOtp: { type: String, default: '123456' },
      paymentDelaySeconds: { type: Number, default: 3 },

      wechatOpenId: { type: String, default: 'mock_wechat_openid' },
      wechatNickname: { type: String, default: '微信用户' },

      alipayUserId: { type: String, default: 'mock_alipay_user' },
      alipayNickname: { type: String, default: '支付宝用户' },
    },

    sms: {
      enabled: { type: Boolean, default: false },
      username: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      passwordMd5: { type: String, default: '' },
      signature: { type: String, default: '' },
    },

    wechatLogin: {
      enabled: { type: Boolean, default: false },
      appId: { type: String, default: '' },
      appSecret: { type: String, default: '' },
      redirectUri: { type: String, default: '' },
    },

    alipayLogin: {
      enabled: { type: Boolean, default: false },
      appId: { type: String, default: '' },
      privateKey: { type: String, default: '' },
      alipayPublicKey: { type: String, default: '' },
      gatewayUrl: {
        type: String,
        default: 'https://openapi.alipay.com/gateway.do',
      },
      redirectUri: { type: String, default: '' },
    },

    wechatPay: {
      enabled: { type: Boolean, default: false },
      appId: { type: String, default: '' },
      mchId: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      apiV3Key: { type: String, default: '' },
      serialNumber: { type: String, default: '' },
      notifyUrl: { type: String, default: '' },
    },

    alipayPay: {
      enabled: { type: Boolean, default: false },
      appId: { type: String, default: '' },
      privateKey: { type: String, default: '' },
      alipayPublicKey: { type: String, default: '' },
      gatewayUrl: {
        type: String,
        default: 'https://openapi.alipay.com/gateway.do',
      },
      notifyUrl: { type: String, default: '' },
      returnUrl: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
)

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)

export default Settings