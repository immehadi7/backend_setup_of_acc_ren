import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from './config/db.js'
import User from './models/User.js'
import Account from './models/Account.js'

const seedData = async () => {
  await connectDB()

  // Clear existing data
  await User.deleteMany()
  await Account.deleteMany()
  console.log('🗑️ Cleared old data')

  // Create admin user
  const admin = await User.create({
    username: 'admin',
    phone:    '13800000000',
    email:    'admin@61zuhao.com',
    password: 'admin123',
    role:     'admin',
  })
  console.log('👤 Admin created:', admin.username)

  // Create seller user
  const seller = await User.create({
    username: 'seller01',
    phone:    '13900000001',
    email:    'seller@61zuhao.com',
    password: 'seller123',
    role:     'seller',
  })
  console.log('👤 Seller created:', seller.username)

  // Create test user
  const testUser = await User.create({
    username: 'testuser',
    phone:    '13700000002',
    email:    'test@61zuhao.com',
    password: '123456',
    role:     'user',
  })
  console.log('👤 Test user created:', testUser.username)

  // Create accounts
  const accounts = [
    {
      seller:       seller._id,
      game:         '英雄联盟',
      rank:         '钻石 I',
      category:     'moba',
      price:        18,
      originalPrice: 35,
      deliveryTime: 10,
      description:  '主玩中单，胜率63%，拥有大量经典皮肤，无封禁记录。165英雄全解锁，200+皮肤。',
      tags:         ['165英雄', '200+皮肤', '高胜率', '无封禁'],
      emoji:        '⚔️',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        1520,
      orders:       45,
    },
    {
      seller:       seller._id,
      game:         '王者荣耀',
      rank:         '王者',
      category:     'moba',
      price:        25,
      originalPrice: 50,
      deliveryTime: 15,
      description:  '超高荣耀王者账号，全英雄解锁，多款传说皮肤，顶分保证。',
      tags:         ['全英雄', '传说皮肤', '顶分', '王者段位'],
      emoji:        '👑',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        2300,
      orders:       67,
    },
    {
      seller:       seller._id,
      game:         '绝地求生',
      rank:         '白金',
      category:     'fps',
      price:        15,
      originalPrice: 28,
      deliveryTime: 20,
      description:  '账号稳定，多款稀有枪皮，低延迟，当前忙碌请提前询单。',
      tags:         ['多把枪皮', '低延迟', '稳定', '稀有皮肤'],
      emoji:        '🎯',
      status:       'busy',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        980,
      orders:       23,
    },
    {
      seller:       seller._id,
      game:         '原神',
      rank:         'AR58',
      category:     'rpg',
      price:        30,
      originalPrice: 55,
      deliveryTime: 8,
      description:  'AR58，多名满命五星角色，全地图探索完成，强力队伍配置。',
      tags:         ['满命角色', '全探索', '强队', 'AR58'],
      emoji:        '🌟',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        3100,
      orders:       89,
    },
    {
      seller:       seller._id,
      game:         'CS2',
      rank:         '传奇鹰',
      category:     'fps',
      price:        22,
      originalPrice: 40,
      deliveryTime: 30,
      description:  '传奇鹰账号，无VAC记录，精准系武器皮肤丰富，高信誉分。',
      tags:         ['高信誉', '无VAC', '精准皮肤', '传奇鹰'],
      emoji:        '💣',
      status:       'offline',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        756,
      orders:       18,
    },
    {
      seller:       seller._id,
      game:         'FIFA Online',
      rank:         '精英III',
      category:     'sport',
      price:        12,
      originalPrice: 22,
      deliveryTime: 12,
      description:  '精英III账号，C罗梅西满卡，化学值满，强力阵容。',
      tags:         ['顶级球星', '高化学', '强阵容', '满卡'],
      emoji:        '⚽',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        445,
      orders:       12,
    },
    {
      seller:       seller._id,
      game:         '永劫无间',
      rank:         '黄金',
      category:     'rpg',
      price:        16,
      originalPrice: 30,
      deliveryTime: 15,
      description:  '黄金段位，多套稀有皮肤，干净记录，正常游戏无异常。',
      tags:         ['稀有套装', '干净记录', '稳定', '黄金段位'],
      emoji:        '🔥',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        620,
      orders:       15,
    },
    {
      seller:       seller._id,
      game:         '英雄联盟',
      rank:         '大师',
      category:     'moba',
      price:        35,
      originalPrice: 65,
      deliveryTime: 20,
      description:  '大师段位，熟练上路下路，拥有多款豪华皮肤，高胜率保证。',
      tags:         ['大师分', '双路见长', '豪华皮肤', '高胜率'],
      emoji:        '⚔️',
      status:       'busy',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        1890,
      orders:       52,
    },
    {
      seller:       seller._id,
      game:         '三角洲行动',
      rank:         '精锐',
      category:     'fps',
      price:        20,
      originalPrice: 38,
      deliveryTime: 15,
      description:  '精锐段位，顶配武器装备，特种皮肤齐全，稳定无封禁。',
      tags:         ['特种装备', '精锐皮肤', '顶配武器', '稳定'],
      emoji:        '🪖',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        890,
      orders:       28,
    },
    {
      seller:       seller._id,
      game:         '王者荣耀',
      rank:         '星耀',
      category:     'moba',
      price:        18,
      originalPrice: 32,
      deliveryTime: 10,
      description:  '星耀段位，多款限定皮肤，全英雄解锁，胜率稳定。',
      tags:         ['限定皮肤', '全英雄', '星耀段位', '稳定'],
      emoji:        '👑',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        1100,
      orders:       33,
    },
    {
      seller:       seller._id,
      game:         '原神',
      rank:         'AR55',
      category:     'rpg',
      price:        20,
      originalPrice: 38,
      deliveryTime: 12,
      description:  'AR55，多名五星角色，深境螺旋12层满星，强力配队。',
      tags:         ['五星角色', '深渊满星', '强力配队', 'AR55'],
      emoji:        '🌟',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        1450,
      orders:       41,
    },
    {
      seller:       seller._id,
      game:         '绝地求生',
      rank:         '钻石',
      category:     'fps',
      price:        20,
      originalPrice: 36,
      deliveryTime: 18,
      description:  '钻石段位，多套稀有套装，高击杀率，稳定低延迟服务器。',
      tags:         ['钻石段位', '稀有套装', '高击杀', '低延迟'],
      emoji:        '🎯',
      status:       'online',
      approvalStatus: 'approved',
      contact:      'WeChat: seller01',
      views:        780,
      orders:       21,
    },
  ]

  await Account.insertMany(accounts)
  console.log(`✅ Created ${accounts.length} accounts`)

  console.log('\n🎉 Seed completed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 Admin   → username: admin    password: admin123')
  console.log('👤 Seller  → username: seller01 password: seller123')
  console.log('👤 User    → username: testuser password: 123456')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  process.exit(0)
}

seedData().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})