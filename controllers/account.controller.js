import Account from '../models/Account.js'

// ─── GET ALL ACCOUNTS (public) ──────────────────
// GET /api/accounts?game=&category=&status=&page=&limit=&search=
export const getAccounts = async (req, res, next) => {
  try {
    const {
      game, category, status = 'online',
      page = 1, limit = 12, search,
    } = req.query

    // Only show approved accounts publicly
    const query = { approvalStatus: 'approved' }

    if (game)     query.game     = game
    if (category) query.category = category
    if (status)   query.status   = status

    // Text search on game, rank, description, tags
    if (search) {
      query.$or = [
        { game:        { $regex: search, $options: 'i' } },
        { rank:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags:        { $elemMatch: { $regex: search, $options: 'i' } } },
      ]
    }

    const skip  = (Number(page) - 1) * Number(limit)
    const total = await Account.countDocuments(query)

    const accounts = await Account.find(query)
      .populate('seller', 'username avatar rating')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    res.status(200).json({
      success: true,
      total,
      page:       Number(page),
      pages:      Math.ceil(total / Number(limit)),
      accounts,
    })
  } catch (error) {
    next(error)
  }
}

// ─── GET SINGLE ACCOUNT (public) ────────────────
// GET /api/accounts/:id
export const getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('seller', 'username avatar rating totalOrders')

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }

    // Increment view count
    account.views += 1
    await account.save({ validateBeforeSave: false })

    res.status(200).json({ success: true, account })
  } catch (error) {
    next(error)
  }
}

// ─── CREATE ACCOUNT (seller only) ───────────────
// POST /api/accounts  (protected)
export const createAccount = async (req, res, next) => {
  try {
    const {
      game, rank, category, price, originalPrice,
      deliveryTime, description, tags, contact,
      pricingNote, emoji,
    } = req.body

    const account = await Account.create({
      seller: req.user.id,
      game, rank, category, price, originalPrice,
      deliveryTime, description,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      contact, pricingNote, emoji,
      approvalStatus: 'pending', // admin must approve
    })

    res.status(201).json({ success: true, message: '发布成功，等待审核', account })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE ACCOUNT (seller only) ───────────────
// PUT /api/accounts/:id  (protected)
export const updateAccount = async (req, res, next) => {
  try {
    let account = await Account.findById(req.params.id)

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }

    // Only the seller or admin can update
    if (account.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限修改此账号' })
    }

    account = await Account.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    res.status(200).json({ success: true, account })
  } catch (error) {
    next(error)
  }
}

// ─── DELETE ACCOUNT (seller / admin) ────────────
// DELETE /api/accounts/:id  (protected)
export const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id)

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }

    if (account.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限删除此账号' })
    }

    await account.deleteOne()
    res.status(200).json({ success: true, message: '已删除' })
  } catch (error) {
    next(error)
  }
}

// ─── UPDATE ONLINE STATUS ────────────────────────
// PATCH /api/accounts/:id/status  (protected)
export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const account = await Account.findById(req.params.id)

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }

    if (account.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权限' })
    }

    account.status = status
    await account.save()

    res.status(200).json({ success: true, account })
  } catch (error) {
    next(error)
  }
}

// ─── ADMIN: APPROVE / REJECT ─────────────────────
// PATCH /api/accounts/:id/approve  (admin only)
export const approveAccount = async (req, res, next) => {
  try {
    const { approvalStatus, rejectionReason } = req.body
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { approvalStatus, rejectionReason },
      { new: true }
    )
    res.status(200).json({ success: true, account })
  } catch (error) {
    next(error)
  }
}

// ─── GET MY LISTINGS (seller) ───────────────────
// GET /api/accounts/my  (protected)
export const getMyAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ seller: req.user.id })
      .sort({ createdAt: -1 })
    res.status(200).json({ success: true, accounts })
  } catch (error) {
    next(error)
  }
}


// ✅ UPDATE commission & deposit (admin + seller)
export const updateCommissionDeposit = async (req, res, next) => {
  try {
    const { commission, deposit } = req.body
    const account = await Account.findById(req.params.id)

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' })
    }

    // Only admin or the seller can update
    if (
      req.user.role !== 'admin' &&
      account.seller.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: '无权限操作' })
    }

    // Validate commission
    if (commission !== undefined) {
      if (commission < 0 || commission > 100) {
        return res.status(400).json({ success: false, message: '佣金比例必须在0-100之间' })
      }
      account.commission = commission
    }

    // Deposit is optional — can be null or any positive number
    if (deposit !== undefined) {
      if (deposit !== null && deposit < 0) {
        return res.status(400).json({ success: false, message: '押金不能为负数' })
      }
      account.deposit = deposit
    }

    await account.save()
    res.json({ success: true, account })
  } catch (err) {
    next(err)
  }
}