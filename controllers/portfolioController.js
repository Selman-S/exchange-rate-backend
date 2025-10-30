// controllers/portfolioController.js

const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');
const Rate = require('../models/Rate');

// Yeni bir portföy oluşturma
exports.createPortfolio = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Yeni bir portföy oluştur ve kullanıcıya ata
    const portfolio = await Portfolio.create({
      user: req.user.id,
      name,
      description,
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

// @desc    Portföy özetini getir
// @route   GET /api/portfolios/:id/summary
// @access  Private
exports.getPortfolioSummary = async (req, res) => {
  try {
    const portfolioId = req.params.id;

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

    // Portföydeki tüm asset'leri al
    const assets = await Asset.find({ portfolio: portfolioId });

    // Boş portföy kontrolü
    if (assets.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          portfolioId: portfolio._id,
          portfolioName: portfolio.name,
          totalCost: 0,
          totalValue: 0,
          pnl: 0,
          pnlPercent: 0,
          assetCount: 0,
          lastUpdated: new Date()
        }
      });
    }

    // Tüm benzersiz varlık isimlerini ve türlerini topla
    const assetIdentifiers = assets.map(a => ({ type: a.type, name: a.name }));
    const uniqueTypes = [...new Set(assets.map(a => a.type))];
    const uniqueNames = [...new Set(assets.map(a => a.name))];

    // En son tarihli kaydı bul
    const latestRateRecord = await Rate.findOne().sort({ date: -1 });
    
    if (!latestRateRecord) {
      console.error('❌ Hiç rate kaydı bulunamadı');
      return res.status(404).json({
        success: false,
        error: 'Fiyat bilgisi bulunamadı'
      });
    }

    const latestDate = latestRateRecord.date;
    console.log('📅 Portfolio Summary için en son tarih:', latestDate.toISOString().split('T')[0]);

    // En son tarihin başlangıcı ve sonu
    const startOfDay = new Date(latestDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(latestDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Tüm güncel fiyatları tek sorguda çek (sadece en son tarih)
    const latestRates = await Rate.find({
      type: { $in: uniqueTypes },
      name: { $in: uniqueNames },
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    console.log(`📊 ${latestRates.length} adet güncel fiyat bulundu`);

    // Her varlık için en son fiyatı bul
    const rateMap = {};
    latestRates.forEach(rate => {
      const key = `${rate.type}-${rate.name}`;
      rateMap[key] = rate;
    });

    let totalCost = 0;
    let totalValue = 0;

    // Her asset için hesaplama yap
    for (const asset of assets) {
      // Maliyet hesabı
      const costAmount = asset.amount * asset.costPrice;
      totalCost += costAmount;

      // Güncel değer hesabı
      const key = `${asset.type}-${asset.name}`;
      const currentRate = rateMap[key];

      if (currentRate) {
        const currentValue = asset.amount * currentRate.buyPrice;
        totalValue += currentValue;
      } else {
        // Eğer güncel fiyat bulunamazsa maliyet fiyatını kullan
        totalValue += costAmount;
      }
    }

    // Kar/Zarar hesaplama
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        portfolioId: portfolio._id,
        portfolioName: portfolio.name,
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalValue: parseFloat(totalValue.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        assetCount: assets.length,
        lastUpdated: new Date()
      }
    });
  } catch (err) {
    console.error('❌ Portfolio Summary Hatası:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

// @desc    Get portfolio value series (tarihsel performans)
// @route   GET /api/portfolios/:id/value-series
// @access  Private
exports.getPortfolioValueSeries = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const { period = '6M', startDate: customStartDate, endDate: customEndDate } = req.query;

    // Portföy kontrolü
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

    // Portföydeki tüm asset'leri al
    const assets = await Asset.find({ portfolio: portfolioId }).sort({ purchaseDate: 1 });

    if (assets.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Tarih aralığını belirle
    let endDate = new Date();
    let startDate = new Date();
    let intervalType = 'monthly'; // 'daily', 'weekly', 'monthly'
    
    if (period === 'CUSTOM' && customStartDate && customEndDate) {
      // Custom date range
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      
      // Interval type'ı tarih aralığına göre belirle
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        intervalType = 'daily';
      } else if (daysDiff <= 90) {
        intervalType = 'weekly';
      } else {
        intervalType = 'monthly';
      }
    } else {
      // Preset periods
      switch (period) {
        case '1W':
          startDate.setDate(startDate.getDate() - 7);
          intervalType = 'daily';
          break;
        case '1M':
          startDate.setMonth(startDate.getMonth() - 1);
          intervalType = 'daily';
          break;
        case '3M':
          startDate.setMonth(startDate.getMonth() - 3);
          intervalType = 'weekly';
          break;
        case '6M':
          startDate.setMonth(startDate.getMonth() - 6);
          intervalType = 'monthly';
          break;
        case '1Y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          intervalType = 'monthly';
          break;
        case '3Y':
          startDate.setFullYear(startDate.getFullYear() - 3);
          intervalType = 'monthly';
          break;
        case 'ALL':
          // En eski asset'in purchase date'ini kullan
          startDate.setTime(assets[0].purchaseDate.getTime());
          intervalType = 'monthly';
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 6);
          intervalType = 'monthly';
      }
    }

    console.log(`📈 Value Series [${period}/${intervalType}]: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);

    // Data points oluştur (günlük/haftalık/aylık)
    const dataPoints = [];
    const currentDate = new Date(startDate);
    
    // Başlangıç tarihini interval'e göre ayarla
    if (intervalType === 'monthly') {
      currentDate.setDate(1); // Ayın ilk günü
    } else if (intervalType === 'weekly') {
      // Haftanın ilk günü (Pazartesi)
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      currentDate.setDate(diff);
    }
    // daily için ayarlama yok

    while (currentDate <= endDate) {
      const pointDate = new Date(currentDate);
      
      // Bu tarihe kadar eklenmiş asset'leri filtrele
      const activeAssets = assets.filter(a => new Date(a.purchaseDate) <= pointDate);
      
      if (activeAssets.length > 0) {
        // Bu asset'ler için o tarihteki fiyatları bul
        let totalValue = 0;
        
        for (const asset of activeAssets) {
          // O tarihe en yakın fiyatı bul
          const rate = await Rate.findOne({
            type: asset.type,
            name: asset.name,
            date: { $lte: pointDate }
          }).sort({ date: -1 });
          
          if (rate) {
            totalValue += asset.amount * rate.buyPrice;
          } else {
            // Fiyat bulunamazsa maliyet fiyatını kullan
            totalValue += asset.amount * asset.costPrice;
          }
        }
        
        dataPoints.push({
          date: pointDate.toISOString().split('T')[0],
          value: parseFloat(totalValue.toFixed(2)),
        });
      }
      
      // Bir sonraki interval'e geç
      if (intervalType === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (intervalType === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (intervalType === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Değişim yüzdelerini hesapla
    for (let i = 1; i < dataPoints.length; i++) {
      const prevValue = dataPoints[i - 1].value;
      const currentValue = dataPoints[i].value;
      dataPoints[i].change = prevValue > 0 
        ? parseFloat((((currentValue - prevValue) / prevValue) * 100).toFixed(2))
        : 0;
    }
    
    if (dataPoints.length > 0) {
      dataPoints[0].change = 0;
    }

    
    res.status(200).json({
      success: true,
      count: dataPoints.length,
      data: dataPoints,
    });
  } catch (err) {
    console.error('❌ Value Series Hatası:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

