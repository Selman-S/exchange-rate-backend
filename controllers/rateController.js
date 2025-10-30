// controllers/rateController.js

const Rate = require('../models/Rate');



// @desc    Belirli bir tür için en son tarihli varlık adlarını getir
// @route   GET /api/rates/names
// @access  Public
exports.getAssetNamesByType = async (req, res, next) => {
    try {
      const { type } = req.query;
  
      
      if (!type) {
        return res.status(400).json({ success: false, error: 'Varlık türü gerekli' });
      }
  
      // En son tarihli kayıtların tarihini bulun
      const latestRate = await Rate.findOne({ type }).sort({ date: -1 });
  
      if (!latestRate) {
        return res.status(404).json({ success: false, error: 'Kayıt bulunamadı' });
      }
  
      
     
  
      // Bu tarihe ve türe ait tüm varlık adlarını bulun
      const assetNames = await Rate.find({ type }).distinct('name');

  
      res.status(200).json({
        success: true,
        data: assetNames,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
  };



// @desc    Belirli bir tarihteki fiyatı getir
// @route   GET /api/rates/price-at
// @access  Public
exports.getPriceAtDate = async (req, res) => {
  try {
    const { type, name, date } = req.query;

    // Validasyon
    if (!type || !name || !date) {
      return res.status(400).json({
        success: false,
        error: 'type, name ve date parametreleri gerekli'
      });
    }

    const requestedDate = new Date(date);
    
    // Geçersiz tarih kontrolü
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz tarih formatı. YYYY-MM-DD formatında olmalı'
      });
    }
    
    // Gelecek tarih kontrolü
    if (requestedDate > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Gelecek tarih için veri sorgulanamaz'
      });
    }

    // Belirtilen tarihte veya öncesinde en yakın fiyatı bul
    const rate = await Rate.findOne({
      type,
      name,
      date: { $lte: requestedDate }
    }).sort({ date: -1 });

    if (!rate) {
      return res.status(404).json({
        success: false,
        error: 'Belirtilen tarih aralığında veri bulunamadı'
      });
    }

    // Tarih tam eşleşme mi?
    const rateDate = new Date(rate.date);
    rateDate.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);
    const isExactMatch = rateDate.getTime() === requestedDate.getTime();

    const response = {
      success: true,
      data: {
        name: rate.name,
        type: rate.type,
        requestedDate: date,
        actualDate: rate.date.toISOString().split('T')[0],
        buyPrice: rate.buyPrice,
        sellPrice: rate.sellPrice,
        isExactMatch
      }
    };

    if (!isExactMatch) {
      response.data.message = 'Belirtilen tarihte veri bulunamadı. En yakın tarih kullanıldı.';
    }

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

// Tüm fiyatları getirme
exports.getRates = async (req, res) => {
  try {
    const { type, name, startDate, endDate } = req.query;
console.log(req.query);

    let query = {};

    if (type) query.type = type;
    if (name) query.name = name;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    } else {
      // Eğer startDate ve endDate sağlanmamışsa, en son tarihli kayıtların tarihini bulalım
      const latestRate = await Rate.findOne(query).sort({ date: -1 });
      if (latestRate) {
        const latestDate = latestRate.date;
        console.log('📅 En son tarihli kayıt:', latestDate.toISOString().split('T')[0]);

        // En son tarihin başlangıcını ve sonunu belirleyelim
        const startOfDay = new Date(latestDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(latestDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Query'ye date filtresi ekleyelim
        query.date = { $gte: startOfDay, $lte: endOfDay };
      } else {
        // Hiç kayıt yoksa boş sonuç döndürelim
        console.log('⚠️ Hiç kayıt bulunamadı');
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    const rates = await Rate.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: rates.length,
      data: rates,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Saatlik veri getir (bugün veya belirli bir gün)
// @route   GET /api/rates/hourly
// @access  Public
exports.getHourlyRates = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const rates = await Rate.find({
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ date: 1 });
    
    // Group by hour
    const hourlyData = {};
    
    rates.forEach(rate => {
      const hour = new Date(rate.date).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          timestamp: rate.date,
          rates: []
        };
      }
      
      hourlyData[hour].rates.push({
        _id: rate._id,
        type: rate.type,
        name: rate.name,
        buyPrice: rate.buyPrice,
        sellPrice: rate.sellPrice,
        changePercent: rate.changePercent || 0
      });
    });
    
    const hourlyRates = Object.values(hourlyData).sort((a, b) => a.hour - b.hour);
    
    res.status(200).json({
      success: true,
      data: {
        date,
        hourlyRates
      }
    });
  } catch (err) {
    console.error('❌ Hourly Rates Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

// @desc    Haftalık/Aylık değişim hesapla
// @route   GET /api/rates/change
// @access  Public
exports.getPriceChange = async (req, res) => {
  try {
    const { type, name, period } = req.query;
    
    if (!type || !name || !period) {
      return res.status(400).json({
        success: false,
        error: 'type, name ve period parametreleri gerekli'
      });
    }
    
    // Current price
    const currentRate = await Rate.findOne({ type, name })
      .sort({ date: -1 });
    
    if (!currentRate) {
      return res.status(404).json({
        success: false,
        error: 'Veri bulunamadı'
      });
    }
    
    // Calculate period start date
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period.toLowerCase()) {
      case 'daily':
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
      case '1w':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'yearly':
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Geçersiz period değeri (daily, weekly, monthly, yearly)'
        });
    }
    
    // Previous price
    const previousRate = await Rate.findOne({
      type,
      name,
      date: { $lte: startDate }
    }).sort({ date: -1 });
    
    if (!previousRate) {
      return res.status(404).json({
        success: false,
        error: 'Önceki dönem için veri bulunamadı'
      });
    }
    
    const currentPrice = currentRate.sellPrice;
    const previousPrice = previousRate.sellPrice;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    res.status(200).json({
      success: true,
      data: {
        type,
        name,
        period,
        currentPrice,
        previousPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        startDate: previousRate.date.toISOString().split('T')[0],
        endDate: currentRate.date.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('❌ Price Change Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

// @desc    Karşılaştırma grafiği için veri
// @route   GET /api/rates/comparison
// @access  Public
exports.getComparisonData = async (req, res) => {
  try {
    const { assets, from, to, normalize = 'false' } = req.query;
    
    if (!assets || !from || !to) {
      return res.status(400).json({
        success: false,
        error: 'assets, from ve to parametreleri gerekli'
      });
    }
    
    // Parse assets: "currency-Dolar,gold-Gram Altın"
    const assetList = assets.split(',').map(a => {
      const [type, ...nameParts] = a.split('-');
      return { 
        type, 
        name: nameParts.join('-').replace(/\+/g, ' ').trim()
      };
    });
    
    const startDate = new Date(from);
    const endDate = new Date(to);
    const series = [];
    
    // Color palette
    const colors = [
      '#1890ff', '#52c41a', '#faad14', '#f5222d', 
      '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'
    ];
    
    for (let i = 0; i < assetList.length; i++) {
      const asset = assetList[i];
      const rates = await Rate.find({
        type: asset.type,
        name: asset.name,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
      
      if (rates.length === 0) continue;
      
      const baseValue = rates[0].sellPrice;
      const data = rates.map(r => ({
        date: r.date.toISOString().split('T')[0],
        value: normalize === 'true' 
          ? parseFloat(((r.sellPrice / baseValue) * 100).toFixed(2))
          : r.sellPrice,
        actual: r.sellPrice
      }));
      
      series.push({
        assetType: asset.type,
        assetName: asset.name,
        color: colors[i % colors.length],
        data
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        from,
        to,
        normalized: normalize === 'true',
        series
      }
    });
  } catch (err) {
    console.error('❌ Comparison Data Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

// @desc    Getiri hesaplama simülatörü
// @route   POST /api/rates/calculate-return
// @access  Public
exports.calculateReturn = async (req, res) => {
  try {
    const { assetType, assetName, amount, investmentDate, comparisonDate } = req.body;
    
    // Validation
    if (!assetType || !assetName || !amount || !investmentDate) {
      return res.status(400).json({
        success: false,
        error: 'Tüm alanlar gerekli (assetType, assetName, amount, investmentDate)'
      });
    }
    
    const finalDate = comparisonDate ? new Date(comparisonDate) : new Date();
    const startDate = new Date(investmentDate);
    
    // Gelecek tarih kontrolü
    if (startDate > new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Yatırım tarihi gelecek olamaz'
      });
    }
    
    // Get initial price
    const initialRate = await Rate.findOne({
      type: assetType,
      name: assetName,
      date: { $lte: startDate }
    }).sort({ date: -1 });
    
    if (!initialRate) {
      return res.status(404).json({
        success: false,
        error: 'Başlangıç tarihi için veri bulunamadı'
      });
    }
    
    // Get current/comparison price
    const finalRate = await Rate.findOne({
      type: assetType,
      name: assetName,
      date: { $lte: finalDate }
    }).sort({ date: -1 });
    
    if (!finalRate) {
      return res.status(404).json({
        success: false,
        error: 'Karşılaştırma tarihi için veri bulunamadı'
      });
    }
    
    const initialPrice = initialRate.sellPrice;
    const finalPrice = finalRate.sellPrice;
    const initialValue = amount * initialPrice;
    const finalValue = amount * finalPrice;
    const totalReturn = finalValue - initialValue;
    const returnPercent = (totalReturn / initialValue) * 100;
    
    // Calculate annualized return
    const durationDays = Math.ceil((finalDate - startDate) / (1000 * 60 * 60 * 24));
    const durationYears = durationDays / 365;
    const annualizedReturn = durationYears > 0 
      ? (Math.pow(finalValue / initialValue, 1 / durationYears) - 1) * 100 
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        assetType,
        assetName,
        amount,
        investmentDate: initialRate.date.toISOString().split('T')[0],
        comparisonDate: finalRate.date.toISOString().split('T')[0],
        initialPrice: parseFloat(initialPrice.toFixed(2)),
        initialValue: parseFloat(initialValue.toFixed(2)),
        currentPrice: parseFloat(finalPrice.toFixed(2)),
        currentValue: parseFloat(finalValue.toFixed(2)),
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        returnPercent: parseFloat(returnPercent.toFixed(2)),
        durationDays,
        annualizedReturn: parseFloat(annualizedReturn.toFixed(2))
      }
    });
  } catch (err) {
    console.error('❌ Calculate Return Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Saatlik fiyat verilerini getir
// @route   GET /api/rates/hourly
// @access  Public
exports.getHourlyRates = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const rates = await Rate.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    // Group by hour
    const hourlyRates = {};
    
    rates.forEach(rate => {
      const hour = new Date(rate.date).getHours();
      
      if (!hourlyRates[hour]) {
        hourlyRates[hour] = {
          hour,
          timestamp: rate.date,
          rates: []
        };
      }
      
      hourlyRates[hour].rates.push({
        _id: rate._id,
        type: rate.type,
        name: rate.name,
        buyPrice: rate.buyPrice,
        sellPrice: rate.sellPrice
      });
    });
    
    res.status(200).json({
      success: true,
      data: {
        date,
        hourlyRates: Object.values(hourlyRates).sort((a, b) => a.hour - b.hour)
      }
    });
  } catch (err) {
    console.error('❌ Get Hourly Rates Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Fiyat değişim yüzdesini getir (günlük/haftalık/aylık/yıllık)
// @route   GET /api/rates/change
// @access  Public
exports.getPriceChange = async (req, res) => {
  try {
    const { type, name, period } = req.query;
    
    if (!type || !name || !period) {
      return res.status(400).json({
        success: false,
        error: 'type, name ve period parametreleri gerekli'
      });
    }
    
    // Current price
    const currentRate = await Rate.findOne({ type, name })
      .sort({ date: -1 });
    
    if (!currentRate) {
      return res.status(404).json({
        success: false,
        error: 'Veri bulunamadı'
      });
    }
    
    // Calculate period start date
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Geçersiz period değeri (daily, weekly, monthly, yearly)'
        });
    }
    
    // Previous price
    const previousRate = await Rate.findOne({
      type,
      name,
      date: { $lte: startDate }
    }).sort({ date: -1 });
    
    if (!previousRate) {
      return res.status(404).json({
        success: false,
        error: 'Geçmiş tarih için veri bulunamadı'
      });
    }
    
    const currentPrice = currentRate.sellPrice;
    const previousPrice = previousRate.sellPrice;
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    res.status(200).json({
      success: true,
      data: {
        type,
        name,
        period,
        currentPrice: parseFloat(currentPrice.toFixed(2)),
        previousPrice: parseFloat(previousPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        startDate: previousRate.date.toISOString().split('T')[0],
        endDate: currentRate.date.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('❌ Get Price Change Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

