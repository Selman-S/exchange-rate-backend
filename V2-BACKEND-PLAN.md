# Backend V2 Geliştirme Planı

## 📋 Version 2 Hedefleri

Version 1'de temel portföy yönetimi ve raporlama özellikleri tamamlandı. Version 2'de kullanıcı deneyimini iyileştirecek ve analiz araçlarını zenginleştirecek özellikler eklenecek.

---

## 🔴 Yüksek Öncelik - V2.1 Sprint

### 1. Fiyat Alarm Sistemi 🔔

**Yeni Model:**
```javascript
// models/PriceAlert.js

const PriceAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  assetType: {
    type: String,
    enum: ['gold', 'currency'],
    required: true,
  },
  assetName: {
    type: String,
    required: true,
  },
  condition: {
    type: String,
    enum: ['ABOVE', 'BELOW', 'EQUALS'],
    required: true,
  },
  targetPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  priceField: {
    type: String,
    enum: ['buyPrice', 'sellPrice'],
    default: 'sellPrice',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isTriggered: {
    type: Boolean,
    default: false,
  },
  triggeredAt: {
    type: Date,
  },
  note: {
    type: String,
    maxlength: 200,
  },
}, { timestamps: true });

PriceAlertSchema.index({ user: 1, isActive: 1 });
PriceAlertSchema.index({ isActive: 1, isTriggered: 1 });
```

**Endpoints:**
- `GET /api/alerts` - Kullanıcının tüm alarmları
- `GET /api/alerts/active` - Aktif alarmlar
- `POST /api/alerts` - Yeni alarm oluştur
- `PUT /api/alerts/:id` - Alarm güncelle
- `DELETE /api/alerts/:id` - Alarm sil
- `POST /api/alerts/:id/toggle` - Aktif/pasif toggle

**Background Job (Cron):**
```javascript
// Her 15 dakikada bir kontrol et
cron.schedule('*/15 * * * *', async () => {
  const activeAlerts = await PriceAlert.find({ 
    isActive: true, 
    isTriggered: false 
  });
  
  for (const alert of activeAlerts) {
    const currentRate = await Rate.findOne({
      type: alert.assetType,
      name: alert.assetName
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
        // %1 tolerance
        shouldTrigger = Math.abs(currentPrice - alert.targetPrice) / alert.targetPrice < 0.01;
        break;
    }
    
    if (shouldTrigger) {
      alert.isTriggered = true;
      alert.triggeredAt = new Date();
      await alert.save();
      
      // TODO: Send notification (email/push)
      console.log(`🔔 Alert triggered for user ${alert.user}: ${alert.assetName} ${alert.condition} ${alert.targetPrice}`);
    }
  }
});
```

**Tahmini Süre:** 4-5 saat

---

### 2. Ana Sayfa - Saatlik Veri Endpoint'i ⏰

**Yeni Route:**
```
GET /api/rates/hourly?date=2025-10-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-10-30",
    "hourlyRates": [
      {
        "hour": 9,
        "timestamp": "2025-10-30T09:00:00Z",
        "rates": [
          {
            "type": "currency",
            "name": "Dolar",
            "buyPrice": 34.52,
            "sellPrice": 34.65
          },
          {
            "type": "gold",
            "name": "Gram Altın",
            "buyPrice": 2845.50,
            "sellPrice": 2862.00
          }
        ]
      },
      {
        "hour": 10,
        "timestamp": "2025-10-30T10:00:00Z",
        "rates": [...]
      }
    ]
  }
}
```

**Implementation:**
```javascript
// Rate modelinde date'i datetime olarak sakla
// Şu anda: { date: "2025-10-30", ... }
// Olmalı: { date: "2025-10-30T09:00:00Z", ... }

// fetchRates.js - Her saat başı çalışıyor zaten (✅ mevcut)
// Sadece grouping logic ekle

exports.getHourlyRates = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const rates = await Rate.find({
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ date: 1 });
    
    // Group by hour
    const hourlyRates = rates.reduce((acc, rate) => {
      const hour = new Date(rate.date).getHours();
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          timestamp: rate.date,
          rates: []
        };
      }
      acc[hour].rates.push({
        type: rate.type,
        name: rate.name,
        buyPrice: rate.buyPrice,
        sellPrice: rate.sellPrice,
        changePercent: rate.changePercent || 0
      });
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: {
        date,
        hourlyRates: Object.values(hourlyRates)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};
```

**Tahmini Süre:** 2-3 saat

---

### 3. Haftalık/Aylık Değişim Hesaplama 📈

**Yeni Route:**
```
GET /api/rates/change?type=currency&name=Dolar&period=weekly
```

**Query Parameters:**
- `type` (required): gold | currency
- `name` (required): Enstrüman adı
- `period` (required): daily | weekly | monthly | yearly

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "currency",
    "name": "Dolar",
    "period": "weekly",
    "currentPrice": 34.52,
    "previousPrice": 33.87,
    "change": 0.65,
    "changePercent": 1.92,
    "startDate": "2025-10-23",
    "endDate": "2025-10-30"
  }
}
```

**Implementation:**
```javascript
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
          error: 'Geçersiz period değeri'
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
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};
```

**Tahmini Süre:** 2-3 saat

---

## 🟡 Orta Öncelik - V2.2 Sprint

### 4. Getiri Hesaplama Simülatörü 🧮

**Yeni Route:**
```
POST /api/calculator/return
```

**Request Body:**
```json
{
  "assetType": "gold",
  "assetName": "Gram Altın",
  "amount": 100,
  "investmentDate": "2024-01-01",
  "comparisonDate": "2025-10-30"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assetType": "gold",
    "assetName": "Gram Altın",
    "amount": 100,
    "investmentDate": "2024-01-01",
    "comparisonDate": "2025-10-30",
    "initialPrice": 2100.50,
    "initialValue": 210050.00,
    "currentPrice": 2862.00,
    "currentValue": 286200.00,
    "totalReturn": 76150.00,
    "returnPercent": 36.27,
    "durationDays": 303,
    "annualizedReturn": 43.68
  }
}
```

**Implementation:**
```javascript
exports.calculateReturn = async (req, res) => {
  try {
    const { assetType, assetName, amount, investmentDate, comparisonDate } = req.body;
    
    // Validation
    if (!assetType || !assetName || !amount || !investmentDate) {
      return res.status(400).json({
        success: false,
        error: 'Tüm alanlar gerekli'
      });
    }
    
    const finalDate = comparisonDate ? new Date(comparisonDate) : new Date();
    const startDate = new Date(investmentDate);
    
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
        initialPrice,
        initialValue: parseFloat(initialValue.toFixed(2)),
        currentPrice: finalPrice,
        currentValue: parseFloat(finalValue.toFixed(2)),
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        returnPercent: parseFloat(returnPercent.toFixed(2)),
        durationDays,
        annualizedReturn: parseFloat(annualizedReturn.toFixed(2))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};
```

**Tahmini Süre:** 3-4 saat

---

### 5. Favoriler Backend'e Taşıma 💾 ✅ TAMAMLANDI

**Yeni Model:**
```javascript
// models/Favorite.js

const FavoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  assetType: {
    type: String,
    enum: ['gold', 'currency'],
    required: true,
  },
  assetName: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Unique constraint: bir kullanıcı aynı varlığı bir kere favorilesin
FavoriteSchema.index({ user: 1, assetType: 1, assetName: 1 }, { unique: true });
FavoriteSchema.index({ user: 1, order: 1 });
```

**Endpoints:**
- `GET /api/favorites` - Favori listesi (sıralı)
- `POST /api/favorites` - Favori ekle
- `DELETE /api/favorites/:id` - Favori çıkar
- `PUT /api/favorites/reorder` - Sıralama güncelle

**Migration:**
LocalStorage'dan backend'e geçiş için migration endpoint:
```javascript
POST /api/favorites/migrate
Body: { favorites: ["Dolar", "Euro", "Gram Altın"] }
```

**Tahmini Süre:** 2-3 saat

---

### 6. Karşılaştırma Grafiği Data Endpoint 📊

**Yeni Route:**
```
GET /api/rates/comparison?assets=currency-Dolar,gold-Gram+Altın&from=2025-01-01&to=2025-10-30&normalize=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "from": "2025-01-01",
    "to": "2025-10-30",
    "normalized": true,
    "series": [
      {
        "assetType": "currency",
        "assetName": "Dolar",
        "color": "#1890ff",
        "data": [
          { "date": "2025-01-01", "value": 100, "actual": 32.50 },
          { "date": "2025-01-02", "value": 101.2, "actual": 32.89 }
        ]
      },
      {
        "assetType": "gold",
        "assetName": "Gram Altın",
        "color": "#faad14",
        "data": [
          { "date": "2025-01-01", "value": 100, "actual": 2100.00 },
          { "date": "2025-01-02", "value": 102.1, "actual": 2144.10 }
        ]
      }
    ]
  }
}
```

**Implementation:**
```javascript
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
      const [type, name] = a.split('-');
      return { type, name: name.replace(/\+/g, ' ') };
    });
    
    const startDate = new Date(from);
    const endDate = new Date(to);
    const series = [];
    
    for (const asset of assetList) {
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
        color: asset.type === 'gold' ? '#faad14' : '#1890ff',
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
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};
```

**Tahmini Süre:** 3-4 saat

---

## 🟢 Düşük Öncelik - V2.3 Sprint

### 7. Merkez Bankası Kuru Entegrasyonu 🏦

**Yeni Data Source:**
TCMB (Merkez Bankası) resmi döviz kurları API'si ile entegrasyon.

**Yeni Field in Rate Model:**
```javascript
centralBankRate: {
  type: Number,
  required: false, // Sadece dövizler için
},
marketRate: {
  type: Number,
  required: false, // Alias for sellPrice
},
spread: {
  type: Number, // Market rate - Central bank rate
  required: false,
}
```

**Tahmini Süre:** 4-5 saat

---

### 8. Ayar Seçenekleri (24/22/18 Ayar) 🥇

**Rate Model'e Yeni Field:**
```javascript
purity: {
  type: Number,
  enum: [24, 22, 18, 14],
  required: false, // Sadece altınlar için
  default: 24
}
```

**Hesaplama:**
- 24 ayar: Base fiyat (mevcut)
- 22 ayar: Base * (22/24)
- 18 ayar: Base * (18/24)

**Tahmini Süre:** 2-3 saat

---

## 📊 V2 Özet Tablo

| Özellik | Endpoint | Öncelik | Süre | Sprint |
|---------|----------|---------|------|--------|
| Fiyat Alarmı | POST /api/alerts | 🔴 Yüksek | 4-5h | V2.1 |
| Saatlik Veri | GET /api/rates/hourly | 🔴 Yüksek | 2-3h | V2.1 |
| Haftalık/Aylık Değişim | GET /api/rates/change | 🔴 Yüksek | 2-3h | V2.1 |
| Getiri Simülatörü | POST /api/calculator/return | 🟡 Orta | 3-4h | V2.2 |
| Favoriler Backend | GET /api/favorites | 🟡 Orta | 2-3h | V2.2 |
| Karşılaştırma Data | GET /api/rates/comparison | 🟡 Orta | 3-4h | V2.2 |
| TCMB Entegrasyonu | - | 🟢 Düşük | 4-5h | V2.3 |
| Ayar Seçenekleri | - | 🟢 Düşük | 2-3h | V2.3 |

**Toplam Backend V2 Geliştirme Süresi:**
- V2.1 Sprint: 8-11 saat (~1.5 gün)
- V2.2 Sprint: 8-11 saat (~1.5 gün)
- V2.3 Sprint: 6-8 saat (~1 gün)

**Toplam: ~4 gün**

---

## 🧪 Test Checklist V2

### Fiyat Alarmı
- [ ] Alarm oluşturma
- [ ] ABOVE/BELOW/EQUALS condition'ları
- [ ] Cron job trigger
- [ ] Notification (console log)
- [ ] Alarm güncelleme/silme

### Saatlik Veri
- [ ] Bugünkü saatlik veriler
- [ ] Geçmiş tarih saatlik veriler
- [ ] Grouping doğruluğu

### Haftalık/Aylık Değişim
- [ ] Daily/Weekly/Monthly/Yearly hesaplama
- [ ] Önceki dönem veri yoksa hata

### Getiri Simülatörü
- [ ] Geçmiş tarih hesaplama
- [ ] Annualized return doğruluğu
- [ ] Farklı varlık türleri

### Karşılaştırma
- [ ] Normalize=true/false
- [ ] Multiple assets
- [ ] Renk paleti

---

## 🚀 Deployment Notları V2

### Migration Adımları

1. **PriceAlert Model:**
   - Yeni collection oluştur
   - Cron job ekle (background process)

2. **Favorite Model:**
   - LocalStorage'dan migrate et
   - Migration endpoint kullan

3. **Rate Model (Optional):**
   - `centralBankRate`, `purity` field'ları ekle (nullable)

---

**Son Güncelleme:** 30 Ekim 2025  
**Versiyon:** 2.0  
**Backend Tahmini Toplam Süre:** 4 gün

