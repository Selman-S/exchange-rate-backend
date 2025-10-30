// controllers/alertController.js

const PriceAlert = require('../models/PriceAlert');
const Rate = require('../models/Rate');

// @desc    Kullanıcının tüm alarmlarını getir
// @route   GET /api/alerts
// @access  Private
exports.getAlerts = async (req, res) => {
  try {
    const { status } = req.query; // 'active' | 'triggered' | 'all'
    
    const filter = { user: req.user.id };
    
    if (status === 'active') {
      filter.isActive = true;
      filter.isTriggered = false;
    } else if (status === 'triggered') {
      filter.isTriggered = true;
    }
    
    const alerts = await PriceAlert.find(filter).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    console.error('❌ Get Alerts Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Aktif alarmları getir
// @route   GET /api/alerts/active
// @access  Private
exports.getActiveAlerts = async (req, res) => {
  try {
    const alerts = await PriceAlert.find({
      user: req.user.id,
      isActive: true,
      isTriggered: false,
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    console.error('❌ Get Active Alerts Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Yeni alarm oluştur
// @route   POST /api/alerts
// @access  Private
exports.createAlert = async (req, res) => {
  try {
    const { assetType, assetName, condition, targetPrice, priceField, note } = req.body;
    
    // Validation
    if (!assetType || !assetName || !condition || !targetPrice) {
      return res.status(400).json({
        success: false,
        error: 'Varlık türü, adı, koşul ve hedef fiyat gereklidir',
      });
    }
    
    if (!['gold', 'currency'].includes(assetType)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz varlık türü',
      });
    }
    
    if (!['ABOVE', 'BELOW', 'EQUALS'].includes(condition)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz koşul',
      });
    }
    
    if (targetPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Hedef fiyat sıfırdan büyük olmalıdır',
      });
    }
    
    // Verify asset exists
    const assetExists = await Rate.findOne({ type: assetType, name: assetName });
    
    if (!assetExists) {
      return res.status(404).json({
        success: false,
        error: 'Belirtilen varlık bulunamadı',
      });
    }
    
    // Create alert
    const alert = await PriceAlert.create({
      user: req.user.id,
      assetType,
      assetName,
      condition,
      targetPrice,
      priceField: priceField || 'sellPrice',
      note,
    });
    
    console.log(`✅ Alarm oluşturuldu: ${assetName} (User: ${req.user.id})`);
    
    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    console.error('❌ Create Alert Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Alarm güncelle
// @route   PUT /api/alerts/:id
// @access  Private
exports.updateAlert = async (req, res) => {
  try {
    let alert = await PriceAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alarm bulunamadı',
      });
    }
    
    // Check ownership
    if (alert.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Bu alarmı güncelleme yetkiniz yok',
      });
    }
    
    // Update fields
    const allowedFields = ['condition', 'targetPrice', 'priceField', 'note', 'isActive'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // If reactivating a triggered alarm, reset isTriggered
    if (updates.isActive && alert.isTriggered) {
      updates.isTriggered = false;
      updates.triggeredAt = null;
    }
    
    alert = await PriceAlert.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    console.log(`✅ Alarm güncellendi: ${alert.assetName} (User: ${req.user.id})`);
    
    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    console.error('❌ Update Alert Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Alarm sil
// @route   DELETE /api/alerts/:id
// @access  Private
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await PriceAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alarm bulunamadı',
      });
    }
    
    // Check ownership
    if (alert.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Bu alarmı silme yetkiniz yok',
      });
    }
    
    await alert.deleteOne();
    
    console.log(`✅ Alarm silindi: ${alert.assetName} (User: ${req.user.id})`);
    
    res.status(200).json({
      success: true,
      message: 'Alarm silindi',
    });
  } catch (err) {
    console.error('❌ Delete Alert Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Alarm toggle (aktif/pasif)
// @route   POST /api/alerts/:id/toggle
// @access  Private
exports.toggleAlert = async (req, res) => {
  try {
    const alert = await PriceAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alarm bulunamadı',
      });
    }
    
    // Check ownership
    if (alert.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Bu alarmı değiştirme yetkiniz yok',
      });
    }
    
    alert.isActive = !alert.isActive;
    
    // If reactivating, reset triggered status
    if (alert.isActive && alert.isTriggered) {
      alert.isTriggered = false;
      alert.triggeredAt = null;
    }
    
    await alert.save();
    
    console.log(`✅ Alarm toggle: ${alert.assetName} -> ${alert.isActive ? 'Aktif' : 'Pasif'} (User: ${req.user.id})`);
    
    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    console.error('❌ Toggle Alert Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Alarmları kontrol et (cron job için)
// @route   Internal function
// @access  Private
exports.checkAlerts = async () => {
  try {
    console.log('🔔 Alarmlar kontrol ediliyor...');
    
    // Get all active, non-triggered alerts
    const alerts = await PriceAlert.find({
      isActive: true,
      isTriggered: false,
    });
    
    let triggeredCount = 0;
    
    for (const alert of alerts) {
      // Get current rate
      const currentRate = await Rate.findOne({
        type: alert.assetType,
        name: alert.assetName,
      }).sort({ date: -1 });
      
      if (!currentRate) continue;
      
      const currentPrice = currentRate[alert.priceField];
      let shouldTrigger = false;
      
      switch (alert.condition) {
        case 'ABOVE':
          shouldTrigger = currentPrice > alert.targetPrice;
          break;
        case 'BELOW':
          shouldTrigger = currentPrice < alert.targetPrice;
          break;
        case 'EQUALS':
          shouldTrigger = Math.abs(currentPrice - alert.targetPrice) < 0.01;
          break;
      }
      
      if (shouldTrigger) {
        alert.isTriggered = true;
        alert.triggeredAt = new Date();
        await alert.save();
        
        triggeredCount++;
        
        console.log(`🔔 ALARM TETİKLENDİ: ${alert.assetName} - ${currentPrice} (Hedef: ${alert.targetPrice})`);
        
        // TODO: Send notification (email, push, etc.)
      }
    }
    
    if (triggeredCount > 0) {
      console.log(`✅ ${triggeredCount} alarm tetiklendi`);
    } else {
      console.log('✅ Tetiklenen alarm yok');
    }
  } catch (err) {
    console.error('❌ Check Alerts Error:', err);
  }
};

