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

