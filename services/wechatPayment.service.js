import { getWechatPaySettings } from './settings.service.js'

export const createWechatPaymentOrder = async ({ order }) => {
  const config = await getWechatPaySettings()
  if (!String(process.env.WECHAT_PAY_ENABLED || config.enabled || 'false') === 'true') {
    throw Object.assign(new Error('微信支付未启用'), { statusCode: 400 })
  }
  return {
    paymentUrl: '',
    message: '当前版本已预留微信支付目录和接口，请补充微信商户证书后接入正式下单逻辑。',
    orderNo: order.orderNo,
  }
}
