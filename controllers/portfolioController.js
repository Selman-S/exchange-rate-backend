// controllers/portfolioController.js

const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');

// Yeni bir portföy oluşturma
exports.createPortfolio = async (req, res) => {
  try {
    const { name } = req.body;

    // Yeni bir portföy oluştur ve kullanıcıya ata
    const portfolio = await Portfolio.create({
      user: req.user.id,
      name,
    });

    res.status(201).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Portföye yeni varlık ekle
// @route   POST /api/portfolios/:portfolioId/assets
// @access  Private
exports.addAsset = async (req, res, next) => {
  try {
    const { type, name, amount, costPrice } = req.body;

    // Gerekli kontrolleri yapın (örneğin, costPrice değeri var mı)

    const asset = await Asset.create({
      portfolio: req.params.portfolioId,
      type,
      name,
      amount,
      costPrice,
    });

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};


// Kullanıcının tüm portföylerini getirme
exports.getPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: portfolios.length,
      data: portfolios,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Belirli bir portföyü getirme
exports.getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Portföy güncelleme
exports.updatePortfolio = async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    portfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// delete 
exports.deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portföy bulunamadı',
      });
    }

    await portfolio.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Portföy başarıyla silindi',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


