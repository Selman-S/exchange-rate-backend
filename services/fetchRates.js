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

  // Bugünün başlangıcı ve sonunu Türkiye saat diliminde belirleme
  const todayStart = moment().tz('Europe/Istanbul').startOf('day').toDate();
  const todayEnd = moment().tz('Europe/Istanbul').endOf('day').toDate();

  // Veritabanına kaydetme (bulkWrite kullanarak)
  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => ({
      updateOne: {
        filter: {
          type: rate.type,
          name: rate.name,
          date: { $gte: todayStart, $lte: todayEnd },
        },
        update: {
          $set: {
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            date: rate.date,
          },
        },
        upsert: true, // Kayıt yoksa oluştur
      },
    }));

    try {
      const bulkWriteResult = await Rate.bulkWrite(bulkOps);
      console.log(
        `Bulk write tamamlandı. Matched: ${bulkWriteResult.matchedCount}, Upserted: ${bulkWriteResult.upsertedCount}`
      );
    } catch (err) {
      console.error('Bulk write sırasında hata oluştu:', err);
    }
  } else {
    console.log('Kaydedilecek veri bulunamadı.');
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
    // Altın fiyatlarını çekme
    const goldResponse = await axios.get(process.env.GOLD_URL);
    await parseAndSaveData(goldResponse.data, 'gold');

    // Döviz kurlarını çekme
    const currencyResponse = await axios.get(process.env.CURRENCY_URL);
    await parseAndSaveData(currencyResponse.data, 'currency');

    console.log('Veriler başarıyla çekildi ve kaydedildi');
  } catch (error) {
    console.error('Veri çekme hatası:', error);
  }
};

module.exports = fetchRates;
