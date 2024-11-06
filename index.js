require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const swaggerDocs = require('./swagger');


const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolioRoutes');
const rateRoutes = require('./routes/rateRoutes');

const fetchRates = require('./services/fetchRates');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
// Veritabanı Bağlantısı
mongoose
.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB bağlantısı başarılı'))
.catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Swagger dokümantasyonu
swaggerDocs(app);

// Veri çekme işlemini başlatma (uygulama ilk çalıştığında)
  // fetchRates();

// Cron job tanımlama
cron.schedule(process.env.FETCH_TIME, () => {
  console.log('Cron job çalıştı:', new Date());
  fetchRates();
});




// Rotalar
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/rates', rateRoutes);
// app.use('/api/assets', assetRoutes); // Asset rotaları portföy rotalarına dahil edildi

app.get('/', (req, res) => {
  res.send('API çalışıyor');
});

// Sunucuyu Başlatma
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
