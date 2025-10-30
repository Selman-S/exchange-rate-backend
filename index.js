require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const swaggerDocs = require('./swagger');

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolioRoutes');
const rateRoutes = require('./routes/rateRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const alertRoutes = require('./routes/alertRoutes');
const {
  fetchHistoricalGoldRates
}= require('./services/fetchHistoricalGold');
const {
  fetchHistoricalCurrencyRates
}= require('./services/fetchHistoricalCurrency');
const fetchRates = require('./services/fetchRates');
const { backfillTodayHours } = require('./services/fetchRates');
const { checkAlerts } = require('./controllers/alertController');
const consolidatePreviousDay = require('./services/consolidatePreviousDay');


//  fetchHistoricalGoldRates()
//  fetchHistoricalCurrencyRates()
const app = express();
const allowedOrigins = [
  'https://exchange-rate-jet.vercel.app', // Üretim frontend URL'si
  'http://localhost:3000', // Geliştirme frontend URL'si (React varsayılan portu 3000)
  // İhtiyaç duyarsanız başka origin'ler ekleyebilirsiniz
];

// CORS Ayarları
const corsOptions = {
  origin: function (origin, callback) {
    // Origin boşsa (örneğin, sunucuya doğrudan yapılan istekler için) izin ver
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy hatası: Bu origin izin verilmiyor.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // İzin verilecek HTTP metodları
  allowedHeaders: ['Content-Type', 'Authorization'], // İzin verilecek header'lar
  credentials: true, // Çerezleri dahil etmek istiyorsanız
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));


// Veritabanı Bağlantısı
mongoose
.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('MongoDB bağlantısı başarılı');
  
  // İlk başlangıçta bugünün eksik saatlerini doldur
  backfillTodayHours();
})
.catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Swagger dokümantasyonu
swaggerDocs(app);

// Veri çekme işlemini başlatma (uygulama ilk çalıştığında)
// fetchRates();


// Cron job tanımlama - Her saat başında çalışır (24/7)
cron.schedule('0 * * * *', () => {
  console.log('========================================');
  console.log('🔄 Cron job çalıştı:', new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }));
  console.log('========================================');
  fetchRates();
},{
  scheduled: true,
  timezone: "Europe/Istanbul"
});

// Alarm kontrolü - Her 15 dakikada bir (24/7)
cron.schedule('*/15 * * * *', () => {
  console.log('🔔 Alarm kontrolü başlatıldı:', new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }));
  checkAlerts();
},{
  scheduled: true,
  timezone: "Europe/Istanbul"
});

// Önceki günü birleştirme - Her gece 00:01'de
cron.schedule('1 0 * * *', () => {
  console.log('🌙 Gece yarısı: Önceki gün birleştiriliyor...');
  consolidatePreviousDay();
},{
  scheduled: true,
  timezone: "Europe/Istanbul"
});




// Rotalar
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/alerts', alertRoutes);
// app.use('/api/assets', assetRoutes); // Asset rotaları portföy rotalarına dahil edildi

app.get('/', (req, res) => {
  res.send('API çalışıyor');
});

// Sunucuyu Başlatma
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
