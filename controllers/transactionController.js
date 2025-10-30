// controllers/transactionController.js

const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');

// @desc    Get all transactions for a portfolio
// @route   GET /api/portfolios/:portfolioId/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { search, page = 1, limit = 20, side } = req.query;

    // Portföy kontrolü ve yetki
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    // Query oluşturma
    let query = { portfolio: portfolioId };
    
    // Arama filtresi
    if (search) {
      query.assetName = { $regex: search, $options: 'i' };
    }

    // İşlem türü filtresi
    if (side && (side === 'BUY' || side === 'SELL')) {
      query.side = side;
    }

    // Sayfalandırma
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(query)
    ]);

    console.log(`📋 ${transactions.length} işlem listelendi (Toplam: ${total})`);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (err) {
    console.error('❌ Transaction List Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/portfolios/:portfolioId/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { 
      assetId,
      side,
      assetType, 
      assetName, 
      amount, 
      price, 
      date, 
      note, 
      priceMode 
    } = req.body;

    // Portföy kontrolü ve yetki
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    // Validasyon
    if (!side || !assetType || !assetName || !amount || !price) {
      return res.status(400).json({
        success: false,
        error: 'Gerekli alanlar eksik',
      });
    }

    // Gelecek tarih kontrolü
    const transactionDate = date ? new Date(date) : new Date();
    if (transactionDate > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Gelecek tarihli işlem eklenemez',
      });
    }

    // Toplam değer hesaplama
    const totalValue = amount * price;

    const transaction = await Transaction.create({
      portfolio: portfolioId,
      asset: assetId || null,
      side,
      assetType,
      assetName,
      amount,
      price,
      totalValue,
      date: transactionDate,
      note: note || '',
      priceMode: priceMode || 'AUTO'
    });

    console.log(`✅ Yeni işlem oluşturuldu: ${side} ${amount} ${assetName} @ ${price}₺`);

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error('❌ Transaction Create Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/portfolios/:portfolioId/transactions/:transactionId
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const { portfolioId, transactionId } = req.params;

    // Portföy kontrolü ve yetki
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      portfolio: portfolioId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'İşlem bulunamadı',
      });
    }

    console.log(`🗑️ İşlem silindi: ${transaction.side} ${transaction.assetName}`);

    res.status(200).json({
      success: true,
      data: {},
      message: 'İşlem başarıyla silindi'
    });
  } catch (err) {
    console.error('❌ Transaction Delete Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

