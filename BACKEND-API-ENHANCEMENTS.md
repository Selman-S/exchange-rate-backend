# Backend API Geliştirme Gereksinimleri

## 📋 Genel Bakış

Frontend upgrade'i için gereken backend değişiklikleri ve yeni endpoint'ler.

---

## 🔴 Kritik Öncelik - MVP İçin Gerekli

### 1. Asset Model & Controller Güncellemesi

**Dosyalar:**
- `models/Asset.js`
- `controllers/assetController.js`

**Mevcut Durum:**
```javascript
// Asset şu an sadece güncel fiyatla ekleniyor
const asset = await Asset.create({
  portfolio: portfolioId,
  type,
  name,
  amount,
  costPrice: latestRate.sellPrice, // Otomatik
  purchaseDate: new Date(), // Otomatik bugün
});
```

**İstenen Durum:**
```javascript
// Kullanıcı geçmiş tarihli ve manuel fiyatla ekleyebilmeli
const { 
  type, 
  name, 
  amount, 
  costPrice,      // OPTIONAL - verilmezse otomatik hesapla
  purchaseDate    // OPTIONAL - verilmezse bugün
} = req.body;

// Eğer costPrice verilmemişse, purchaseDate'teki fiyatı bul
if (!costPrice && purchaseDate) {
  const historicalRate = await Rate.findOne({
    type,
    name,
    date: { $lte: new Date(purchaseDate) }
  }).sort({ date: -1 });
  
  costPrice = historicalRate?.sellPrice;
}

// Eğer purchaseDate verilmemişse bugün
const finalPurchaseDate = purchaseDate || new Date();

const asset = await Asset.create({
  portfolio: portfolioId,
  type,
  name,
  amount,
  costPrice: costPrice || latestRate.sellPrice,
  purchaseDate: finalPurchaseDate,
});
```

**Test Senaryoları:**
- ✅ Geçmiş tarihli işlem ekle (purchaseDate + costPrice manual)
- ✅ Geçmiş tarihli işlem ekle (purchaseDate otomatik, costPrice auto)
- ✅ Güncel işlem ekle (her şey otomatik - mevcut davranış)

**Tahmini Süre:** 1-2 saat

---

### 2. Tarihte Fiyat Sorgulama Endpoint'i

**Yeni Route:**
```
GET /api/rates/price-at
```

**Query Parameters:**
- `type` (required): gold | currency
- `name` (required): Enstrüman adı (örn: "Amerikan Doları")
- `date` (required): YYYY-MM-DD formatında tarih

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Amerikan Doları",
    "type": "currency",
    "requestedDate": "2024-01-15",
    "actualDate": "2024-01-15",
    "buyPrice": 29.87,
    "sellPrice": 30.12,
    "isExactMatch": true
  }
}
```

**Eğer tarihte veri yoksa:**
```json
{
  "success": true,
  "data": {
    "name": "Amerikan Doları",
    "type": "currency",
    "requestedDate": "2024-01-15",
    "actualDate": "2024-01-14",  // En yakın önceki tarih
    "buyPrice": 29.87,
    "sellPrice": 30.12,
    "isExactMatch": false,
    "message": "Belirtilen tarihte veri bulunamadı. En yakın tarih kullanıldı."
  }
}
```

**Implementation:**
```javascript
// controllers/rateController.js

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
    const isExactMatch = rateDate.toDateString() === requestedDate.toDateString();

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
```

**Route Ekleme:**
```javascript
// routes/rateRoutes.js
router.get('/price-at', getPriceAtDate);
```

**Test Senaryoları:**
- ✅ Tam tarih eşleşmesi (veri var)
- ✅ Tarih eşleşmemesi (en yakın önceki tarih dönmeli)
- ✅ Gelecek tarih (400 error)
- ✅ Veri aralığı dışında (404 error)
- ✅ Eksik parametreler (400 error)

**Tahmini Süre:** 2-3 saat

---

### 3. Portföy Özeti Endpoint'i

**Yeni Route:**
```
GET /api/portfolios/:id/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolioId": "507f1f77bcf86cd799439011",
    "portfolioName": "Ana Portföyüm",
    "totalCost": 150000.00,
    "totalValue": 165500.00,
    "pnl": 15500.00,
    "pnlPercent": 10.33,
    "assetCount": 5,
    "lastUpdated": "2024-10-29T20:00:00Z"
  }
}
```

**Implementation:**
```javascript
// controllers/portfolioController.js

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

    let totalCost = 0;
    let totalValue = 0;

    // Her asset için güncel fiyatı çek ve hesapla
    for (const asset of assets) {
      // Maliyet hesabı
      const costAmount = asset.amount * asset.costPrice;
      totalCost += costAmount;

      // Güncel değer hesabı
      const currentRate = await Rate.findOne({
        type: asset.type,
        name: asset.name
      }).sort({ date: -1 });

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
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};
```

**Route Ekleme:**
```javascript
// routes/portfolioRoutes.js
router.get('/:id/summary', getPortfolioSummary);
```

**Performans Notu:**
- Bu endpoint'te N+1 query problemi var (her asset için Rate sorgusu)
- **Optimizasyon:** Tüm rate'leri tek query'de çek:
  ```javascript
  const assetTypes = [...new Set(assets.map(a => a.type))];
  const assetNames = [...new Set(assets.map(a => a.name))];
  
  const latestRates = await Rate.aggregate([
    { $match: { type: { $in: assetTypes }, name: { $in: assetNames } } },
    { $sort: { date: -1 } },
    { $group: {
        _id: { type: '$type', name: '$name' },
        latestRate: { $first: '$$ROOT' }
      }
    }
  ]);
  ```

**Tahmini Süre:** 2-3 saat (optimizasyon ile birlikte)

---

## 🟡 Orta Öncelik - 2. Sprint

### 4. Transaction (İşlem Geçmişi) Modeli

**Yeni Model:**
```javascript
// models/Transaction.js

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.ObjectId,
      ref: 'Portfolio',
      required: true,
      index: true, // Performans için
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: 'Asset',
      // Asset silinirse null olabilir
    },
    side: {
      type: String,
      enum: ['BUY', 'SELL'],
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true, // Tarih filtreleme için
    },
    note: {
      type: String,
      maxlength: 500,
    },
    priceMode: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      default: 'AUTO',
    },
  },
  { 
    timestamps: true,
    // İndeks optimizasyonu
    indexes: [
      { portfolio: 1, date: -1 },
      { portfolio: 1, assetName: 1 }
    ]
  }
);

// Virtual: formatted date
TransactionSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

module.exports = mongoose.model('Transaction', TransactionSchema);
```

**Yeni Controller:**
```javascript
// controllers/transactionController.js

const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');

// @desc    Portföy işlemlerini listele
// @route   GET /api/portfolios/:portfolioId/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { search, page = 1, pageSize = 10 } = req.query;

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

    // Query oluşturma
    let query = { portfolio: portfolioId };
    
    if (search) {
      query.assetName = { $regex: search, $options: 'i' };
    }

    // Sayfalandırma
    const skip = (page - 1) * pageSize;
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(pageSize)),
      Transaction.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
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

// @desc    Yeni işlem ekle
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
      date: date || new Date(),
      note,
      priceMode: priceMode || 'AUTO'
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

// @desc    İşlem sil
// @route   DELETE /api/portfolios/:portfolioId/transactions/:transactionId
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const { portfolioId, transactionId } = req.params;

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

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction
};
```

**Yeni Routes:**
```javascript
// routes/transactionRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTransactions,
  createTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:transactionId')
  .delete(deleteTransaction);

module.exports = router;
```

**Portfolio Routes'a Ekle:**
```javascript
// routes/portfolioRoutes.js

const transactionRouter = require('./transactionRoutes');

// Mevcut kod...
router.use('/:portfolioId/transactions', transactionRouter);
```

**Asset Controller'da Transaction Kaydetme:**
```javascript
// controllers/assetController.js

// createAsset fonksiyonunda:
const asset = await Asset.create({...});

// İşlem kaydı oluştur
await Transaction.create({
  portfolio: portfolioId,
  asset: asset._id,
  side: 'BUY',
  assetType: type,
  assetName: name,
  amount,
  price: costPrice,
  totalValue: amount * costPrice,
  date: finalPurchaseDate,
  priceMode: req.body.costPrice ? 'MANUAL' : 'AUTO'
});
```

**Tahmini Süre:** 4-5 saat

---

### 5. Portföy Değer Zaman Serisi

**Yeni Route:**
```
GET /api/portfolios/:id/value-series?from=2024-01-01&to=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolioId": "507f1f77bcf86cd799439011",
    "from": "2024-01-01",
    "to": "2024-12-31",
    "series": [
      { "date": "2024-01-01", "value": 100000.00 },
      { "date": "2024-01-02", "value": 102000.00 },
      { "date": "2024-01-03", "value": 101500.00 }
    ]
  }
}
```

**Implementation (Basit Versiyon):**
```javascript
// controllers/portfolioController.js

exports.getPortfolioValueSeries = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const { from, to } = req.query;

    // Validasyon
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'from ve to parametreleri gerekli'
      });
    }

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

    // Tüm asset'leri al
    const assets = await Asset.find({ portfolio: portfolioId });

    if (assets.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          portfolioId,
          from,
          to,
          series: []
        }
      });
    }

    // Tarih aralığını oluştur
    const startDate = new Date(from);
    const endDate = new Date(to);
    const dates = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Her tarih için portföy değerini hesapla
    const series = [];
    
    for (const date of dates) {
      let dailyValue = 0;

      // Her asset için o tarihteki fiyatı bul
      for (const asset of assets) {
        // Asset'in bu tarihte mevcut olup olmadığını kontrol et
        if (asset.purchaseDate > date) {
          continue; // Henüz alınmamış
        }

        // O tarihteki veya öncesindeki en yakın fiyatı bul
        const rate = await Rate.findOne({
          type: asset.type,
          name: asset.name,
          date: { $lte: date }
        }).sort({ date: -1 });

        if (rate) {
          dailyValue += asset.amount * rate.buyPrice;
        }
      }

      series.push({
        date: date.toISOString().split('T')[0],
        value: parseFloat(dailyValue.toFixed(2))
      });
    }

    res.status(200).json({
      success: true,
      data: {
        portfolioId,
        from,
        to,
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

**⚠️ Performans Uyarısı:**
Bu hesaplama çok maliyetli! Her gün için her asset için Rate sorgusu yapıyor.

**Optimizasyon Önerileri:**
1. **Önbellek:** Hesaplanan değerleri cache'le (Redis)
2. **Batch Query:** Tüm rate'leri tek seferde çek
3. **Sınırlama:** Maksimum 90 gün gibi bir limit koy
4. **Background Job:** Günlük cron ile hesapla ve cache'le

**Tahmini Süre:** 3-4 saat (basit versiyon), 6-8 saat (optimize edilmiş)

---

## 🟢 Düşük Öncelik - Gelecek Özellikler

### 6. Favoriler Sistemi

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
  }
}, { timestamps: true });

// Unique constraint
FavoriteSchema.index({ user: 1, assetType: 1, assetName: 1 }, { unique: true });
```

**Endpoints:**
- `GET /api/favorites` - Favori listesi
- `POST /api/favorites` - Favori ekle
- `DELETE /api/favorites/:id` - Favori çıkar

**Tahmini Süre:** 2-3 saat

---

### 7. Benchmark Verileri

**Endpoint:**
```
GET /api/rates/benchmark?type=currency&names=USD,EUR&from=2024-01-01&to=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "USD": [
      { "date": "2024-01-01", "value": 29.87 },
      { "date": "2024-01-02", "value": 30.12 }
    ],
    "EUR": [
      { "date": "2024-01-01", "value": 33.45 },
      { "date": "2024-01-02", "value": 33.67 }
    ]
  }
}
```

**Not:** Mevcut `/api/rates` endpoint'i ile yapılabilir, ayrı endpoint isteğe bağlı.

**Tahmini Süre:** 1-2 saat

---

## 📊 Özet Tablo

| Özellik | Endpoint | Öncelik | Süre | Bağımlılık |
|---------|----------|---------|------|------------|
| Asset purchaseDate/costPrice | - | 🔴 Kritik | 1-2h | Yok |
| Price-at-date | GET /api/rates/price-at | 🔴 Kritik | 2-3h | Yok |
| Portfolio Summary | GET /api/portfolios/:id/summary | 🔴 Kritik | 2-3h | Yok |
| Transaction Model | POST /api/portfolios/:id/transactions | 🟡 Orta | 4-5h | Yok |
| Portfolio Value Series | GET /api/portfolios/:id/value-series | 🟡 Orta | 3-4h | Asset tarihleri |
| Favorites | GET/POST/DELETE /api/favorites | 🟢 Düşük | 2-3h | Yok |
| Benchmark | GET /api/rates/benchmark | 🟢 Düşük | 1-2h | Yok |

**Toplam Backend Geliştirme Süresi:**
- Kritik: 5-8 saat (~1 gün)
- Orta: 7-9 saat (~1 gün)
- Düşük: 3-5 saat (~0.5 gün)

**Toplam: ~2.5 gün**

---

## 🧪 Test Checklist

### Manuel Test Senaryoları

#### 1. Price-at-date Endpoint
- [ ] Tam tarih eşleşmesi
- [ ] Yakın tarih fallback
- [ ] Gelecek tarih hatası
- [ ] Eksik parametre hatası
- [ ] Veri aralığı dışında hatası

#### 2. Asset Ekleme
- [ ] Geçmiş tarihli + manuel fiyat
- [ ] Geçmiş tarihli + otomatik fiyat
- [ ] Güncel tarih + otomatik fiyat
- [ ] purchaseDate validation

#### 3. Portfolio Summary
- [ ] Boş portföy
- [ ] Tek asset'li portföy
- [ ] Çok asset'li portföy
- [ ] Asset fiyatı bulunamayan durum

#### 4. Transactions
- [ ] Listeleme + pagination
- [ ] Arama
- [ ] Ekleme
- [ ] Silme

#### 5. Value Series
- [ ] Kısa aralık (7 gün)
- [ ] Uzun aralık (90 gün)
- [ ] Boş portföy
- [ ] Asset purchase date kontrolü

---

## 🚀 Deployment Notları

### Migration Adımları

1. **Asset Model Güncellemesi:**
   - Schema'yı güncelle
   - Mevcut verilerde `purchaseDate` null ise default değer ata:
     ```javascript
     db.assets.updateMany(
       { purchaseDate: null },
       { $set: { purchaseDate: new Date() } }
     );
     ```

2. **Transaction Model (Opsiyonel):**
   - Yeni collection oluştur
   - Mevcut asset'lerden transaction'ları generate et (migration script)

3. **Yeni Index'ler:**
   ```javascript
   db.transactions.createIndex({ portfolio: 1, date: -1 });
   db.transactions.createIndex({ portfolio: 1, assetName: 1 });
   ```

---

## 📝 Sonraki Adımlar

1. ✅ Bu planı gözden geçir
2. ✅ Kritik endpoint'leri geliştir (1 gün)
   - ✅ Asset purchaseDate/costPrice parametreleri
   - ✅ GET /api/rates/price-at endpoint
   - ✅ GET /api/portfolios/:id/summary endpoint
3. ⬜ Test et (Manuel test bekleniyor)
4. ⬜ Frontend ile entegrasyon test
5. ⬜ Orta öncelikli özellikleri geliştir (1 gün)
6. ⬜ Production deployment

---

**Son Güncelleme:** 29 Ekim 2025  
**Versiyon:** 1.0  
**Backend Tahmini Toplam Süre:** 2-3 gün

