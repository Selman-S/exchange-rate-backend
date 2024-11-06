// controllers/assetController.js

const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const Rate = require('../models/Rate');

// Yeni bir varlık oluşturma
exports.createAsset = async (req, res) => {
  try {
    const { type, name, amount } = req.body;
    const portfolioId = req.params.portfolioId;

    // Portföyü kontrol et
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

    // Güncel fiyatı al
    const latestRate = await Rate.findOne({ type, name })
      .sort({ date: -1 });

    if (!latestRate) {
      return res.status(404).json({
        success: false,
        error: 'Güncel fiyat bulunamadı',
      });
    }

    // Yeni varlık oluştur
    const asset = await Asset.create({
      portfolio: portfolioId,
      type,
      name,
      amount,
      costPrice: latestRate.sellPrice, // Maliyet fiyatı satış fiyatına göre
      purchaseDate: new Date(),
    });

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Belirli bir portföydeki tüm varlıkları getirme
exports.getAssets = async (req, res) => {
  try {
    const portfolioId = req.params.portfolioId;

    // Portföyü kontrol et
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

    const assets = await Asset.find({ portfolio: portfolioId });

    res.status(200).json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Belirli bir varlığı getirme
exports.getAsset = async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;

    // Portföyü kontrol et
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

    const asset = await Asset.findOne({
      _id: assetId,
      portfolio: portfolioId,
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Varlık bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Varlığı güncelleme
exports.updateAsset = async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;

    // Portföyü kontrol et
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

    let asset = await Asset.findOne({
      _id: assetId,
      portfolio: portfolioId,
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Varlık bulunamadı',
      });
    }

    asset = await Asset.findByIdAndUpdate(
      assetId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Varlığı silme
// Diğer importlar...

// @desc    Varlığı sil
// @route   DELETE /api/portfolios/:portfolioId/assets/:assetId
// @access  Private
exports.deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.assetId);
console.log(asset);

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Varlık bulunamadı' });
    }

    // Varlığın ilgili portföye ait olduğunu kontrol edin
    if (asset.portfolio.toString() !== req.params.portfolioId) {
      return res.status(401).json({ success: false, error: 'Yetkisiz işlem' });
    }

    // Varlığı sil
    await asset.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};