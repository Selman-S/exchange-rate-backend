// services/fetchRates.js

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Rate = require('../models/Rate');
const moment = require('moment-timezone'); // moment-timezone ekledik
require('dotenv').config();

// Veritabanı bağlantısı
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });

// Tarih formatlama (DD%2FMM%2FYYYY)
const formatDate = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // Ocak = 0
  const yyyy = date.getFullYear();
  return `${dd}%2F${mm}%2F${yyyy}`;
};

// Güncellenmiş TL formatını parse etme
const parseTL = (tlString) => {
  if (typeof tlString !== 'string') {
    console.error('Girdi bir string olmalıdır.');
    return null;
  }

  // Boşlukları temizle
  let sanitized = tlString.trim();

  // "TL", "₺" gibi sembolleri kaldır
  sanitized = sanitized.replace(/[^0-9.,-]/g, '');

  // Binlik ayırıcıları kaldırmak için noktaları kaldır
  sanitized = sanitized.replace(/\./g, '');

  // Virgülü noktaya çevir
  sanitized = sanitized.replace(/,/g, '.');

  // Sayıya dönüştür
  const number = parseFloat(sanitized);

  if (isNaN(number)) {
    console.error('Dönüştürülemeyen sayı:', tlString);
    return null;
  }

  return number;
};

// Döviz ve Altın verilerini parse etme ve kaydetme
const parseAndSaveData = async (html, type) => {
  const $ = cheerio.load(html);
  const rates = [];

  $('.table tbody tr').each((index, element) => {
    let name;
    if (type === 'gold') {
      name = $(element).find('td:nth-child(1)').text().trim();
    } else if (type === 'currency') {
      name = $(element).find('td:nth-child(1) h5').text().trim();
    }
    if (name === '') {
      return;
    }

    const buyPrice = parseTL($(element).find('[id$="Buy"]').text());
    const sellPrice = parseTL($(element).find('[id$="Sell"]').text());

    if (buyPrice === null || sellPrice === null) {
      console.error(`Fiyat parse edilemedi: ${name}`);
      return;
    }

    // Türkiye saat diliminde tarih oluşturma
    const dateInTurkey = moment().tz('Europe/Istanbul').toDate();

    const rate = {
      type,
      name,
      buyPrice,
      sellPrice,
      date: dateInTurkey, // Türkiye saatiyle günün tarihi
    };
    rates.push(rate);
  });

  // Bugünkü SAATİN başlangıcı ve sonu (Saatlik kayıt için)
  const currentHourStart = moment().tz('Europe/Istanbul').startOf('hour').toDate();
  const currentHourEnd = moment().tz('Europe/Istanbul').endOf('hour').toDate();

  // Veritabanına kaydetme (bulkWrite kullanarak)
  if (rates.length > 0) {
    console.log(`\n📊 ${type.toUpperCase()} - Toplam ${rates.length} veri çekildi:`);
    console.log(`⏰ Saat: ${moment().tz('Europe/Istanbul').format('HH:mm')}`);
    // İlk 3 veriyi örnek olarak göster
    rates.slice(0, 3).forEach(rate => {
      console.log(`  • ${rate.name}: Alış=${rate.buyPrice.toFixed(2)} TL, Satış=${rate.sellPrice.toFixed(2)} TL`);
    });
    if (rates.length > 3) {
      console.log(`  ... ve ${rates.length - 3} veri daha`);
    }

    // BUGÜN İÇİN SAATLİK KAYIT (Her saat için ayrı kayıt)
    const bulkOps = rates.map((rate) => ({
      updateOne: {
        filter: {
          type: rate.type,
          name: rate.name,
          date: { $gte: currentHourStart, $lte: currentHourEnd }, // Bu saate ait kayıt var mı?
        },
        update: {
          $set: {
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            date: rate.date, // Tam saat bilgisiyle kaydediyoruz
          },
        },
        upsert: true, // Bu saat için kayıt yoksa oluştur
      },
    }));

    try {
      const bulkWriteResult = await Rate.bulkWrite(bulkOps);
      console.log(
        `✅ ${type.toUpperCase()} - Veritabanına kaydedildi. Güncellenen: ${bulkWriteResult.matchedCount}, Yeni: ${bulkWriteResult.upsertedCount}\n`
      );
    } catch (err) {
      console.error(`❌ ${type.toUpperCase()} - Bulk write sırasında hata oluştu:`, err);
    }
  } else {
    console.log(`⚠️  ${type.toUpperCase()} - Kaydedilecek veri bulunamadı.`);
  }
};

// Tarih aralığını oluşturma
const getDateRange = (start, end) => {
  const dateArray = [];
  let currentDate = new Date(start);

  while (currentDate <= end) {
    dateArray.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
};

// VIEWSTATE değerini almak için
const getViewState = async () => {
  try {
    const response = await axios.get('https://www.altinkaynak.com/Doviz/Kur', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const $ = cheerio.load(response.data);
    const viewState = $('input[name="__VIEWSTATE"]').val();
    return viewState;
  } catch (err) {
    console.error('VIEWSTATE alınamadı:', err.message);
    throw err;
  }
};

// Ana fonksiyon
const fetchRates = async () => {
  try {
    console.log('\n🚀 Veri çekme işlemi başlıyor...');
    console.log('⏰ Zaman:', moment().tz('Europe/Istanbul').format('DD.MM.YYYY HH:mm:ss'));
    
    // Altın fiyatlarını çekme
    console.log('\n🥇 Altın fiyatları çekiliyor...');
    const goldResponse = await axios.get(process.env.GOLD_URL);
    await parseAndSaveData(goldResponse.data, 'gold');

    // Döviz kurlarını çekme
    console.log('💱 Döviz kurları çekiliyor...');
    const currencyResponse = await axios.get(process.env.CURRENCY_URL);
    await parseAndSaveData(currencyResponse.data, 'currency');

    console.log('✨ Tüm veriler başarıyla çekildi ve kaydedildi!');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Veri çekme hatası:', error.message);
    console.log('========================================\n');
  }
};

// Bugünün eksik saatlerini doldur (ilk başlangıçta)
const backfillTodayHours = async () => {
  try {
    const now = moment().tz('Europe/Istanbul');
    const todayStart = moment().tz('Europe/Istanbul').startOf('day');
    const currentHour = now.hour();
    
    console.log('\n🔄 Bugünün eksik saatleri kontrol ediliyor...');
    console.log(`📅 Tarih: ${now.format('DD.MM.YYYY')}`);
    console.log(`⏰ Mevcut saat: ${currentHour}:00\n`);
    
    // 00:00'dan şu ana kadar her saat için kontrol et (24 saat)
    const startHour = 0; // Gece yarısından başla
    const endHour = currentHour; // Şu anki saate kadar
    
    let filledCount = 0;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Bu saate ait kayıt var mı kontrol et
      const hourStart = moment().tz('Europe/Istanbul').hour(hour).minute(0).second(0).toDate();
      const hourEnd = moment().tz('Europe/Istanbul').hour(hour).minute(59).second(59).toDate();
      
      const existingCount = await Rate.countDocuments({
        date: { $gte: hourStart, $lte: hourEnd }
      });
      
      if (existingCount === 0) {
        console.log(`⏰ ${hour}:00 için veri yok, çekiliyor...`);
        
        // Veriyi çek ve kaydet (mevcut API'den)
        try {
          const goldResponse = await axios.get(process.env.GOLD_URL);
          const currencyResponse = await axios.get(process.env.CURRENCY_URL);
          
          // Parse ve kaydet (date'i o saate ayarlayarak)
          const goldData = await parseAndSaveDataForHour(goldResponse.data, 'gold', hour);
          const currencyData = await parseAndSaveDataForHour(currencyResponse.data, 'currency', hour);
          
          filledCount++;
          console.log(`✅ ${hour}:00 verisi kaydedildi`);
        } catch (err) {
          console.error(`❌ ${hour}:00 verisi çekilirken hata:`, err.message);
        }
      }
    }
    
    if (filledCount > 0) {
      console.log(`\n🎉 Toplam ${filledCount} saat verisi dolduruldu!`);
    } else {
      console.log('\n✅ Tüm saatler zaten mevcut, backfill gerekmiyor.');
    }
    console.log('========================================\n');
  } catch (err) {
    console.error('❌ Backfill hatası:', err.message);
  }
};

// Belirli bir saat için veri parse ve kaydet
const parseAndSaveDataForHour = async (html, type, hour) => {
  const $ = cheerio.load(html);
  const rates = [];

  $('.table tbody tr').each((index, element) => {
    let name;
    if (type === 'gold') {
      name = $(element).find('td:nth-child(1)').text().trim();
    } else if (type === 'currency') {
      name = $(element).find('td:nth-child(1) h5').text().trim();
    }
    if (name === '') {
      return;
    }

    const buyPrice = parseTL($(element).find('[id$="Buy"]').text());
    const sellPrice = parseTL($(element).find('[id$="Sell"]').text());

    if (buyPrice === null || sellPrice === null) {
      return;
    }

    // Belirtilen saate göre tarih oluştur
    const dateForHour = moment()
      .tz('Europe/Istanbul')
      .hour(hour)
      .minute(0)
      .second(0)
      .toDate();

    const rate = {
      type,
      name,
      buyPrice,
      sellPrice,
      date: dateForHour,
    };
    rates.push(rate);
  });

  // Kaydet
  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => ({
      insertOne: {
        document: rate
      }
    }));

    try {
      await Rate.bulkWrite(bulkOps);
    } catch (err) {
      console.error(`Backfill kayıt hatası (${type}):`, err.message);
    }
  }
};

module.exports = fetchRates;
module.exports.backfillTodayHours = backfillTodayHours;
