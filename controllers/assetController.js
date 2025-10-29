// controllers/assetController.js

const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const Rate = require('../models/Rate');

// Yeni bir varlık oluşturma
exports.createAsset = async (req, res) => {
  try {
    const { type, name, amount, costPrice, purchaseDate } = req.body;
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

    // purchaseDate belirleme (verilmemişse bugün)
    const finalPurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();

    // Gelecek tarih kontrolü
    if (finalPurchaseDate > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Gelecek tarihli işlem eklenemez',
      });
    }

    // costPrice belirleme
    let finalCostPrice = costPrice;

    // Eğer costPrice verilmemişse, purchaseDate'teki fiyatı bul
    if (!finalCostPrice) {
      const historicalRate = await Rate.findOne({
        type,
        name,
        date: { $lte: finalPurchaseDate }
      }).sort({ date: -1 });

      if (!historicalRate) {
        return res.status(404).json({
          success: false,
          error: 'Belirtilen tarih için fiyat bulunamadı',
        });
      }

      finalCostPrice = historicalRate.sellPrice;
    }

    // Yeni varlık oluştur
    const asset = await Asset.create({
      portfolio: portfolioId,
      type,
      name,
      amount,
      costPrice: finalCostPrice,
      purchaseDate: finalPurchaseDate,
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