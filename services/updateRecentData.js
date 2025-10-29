// services/updateRecentData.js
// 6 Kasım 2024'ten bugüne kadar eksik verileri çekmek için script

const { fetchHistoricalCurrencyRates } = require('./fetchHistoricalCurrency');
const { fetchHistoricalGoldRates } = require('./fetchHistoricalGold');

// Orjinal fonksiyonları override etmek için geçici bir modül oluşturuyoruz
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Rate = require('../models/Rate');
const moment = require('moment-timezone');
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
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}%2F${mm}%2F${yyyy}`;
};

// TL formatını parse etme
const parseTL = (tlString) => {
  if (typeof tlString !== 'string') {
    console.error('Girdi bir string olmalıdır.');
    return null;
  }

  let sanitized = tlString.trim();
  sanitized = sanitized.replace(/\./g, '');
  sanitized = sanitized.replace(/,/g, '.');
  sanitized = sanitized.replace(/[^0-9.-]/g, '');

  const number = parseFloat(sanitized);

  if (isNaN(number)) {
    console.error('Dönüştürülemeyen sayı:', tlString);
    return null;
  }

  return number;
};

// Döviz verilerini parse etme ve kaydetme
const parseCurrencyData = async (html, type, date) => {
  const $ = cheerio.load(html);
  const rates = [];

  $('.table tbody tr').each((index, element) => {
    const code = $(element).find('span.code').text().trim();
    const name = $(element).find('h5').text().trim();

    if (code === '') return;

    const buyPrice = parseTL($(element).find('td:nth-child(3)').text());
    const sellPrice = parseTL($(element).find('td:nth-child(4)').text());

    if (buyPrice === null || sellPrice === null) {
      console.error(`Fiyat parse edilemedi: ${code} Tarih: ${moment(date).format('YYYY-MM-DD')}`);
      return;
    }

    const dateInTurkey = moment(date).tz('Europe/Istanbul').startOf('day').toDate();

    const rate = {
      type,
      name,
      buyPrice,
      sellPrice,
      date: dateInTurkey,
    };

    rates.push(rate);
  });

  const startOfDay = moment(date).tz('Europe/Istanbul').startOf('day').toDate();
  const endOfDay = moment(date).tz('Europe/Istanbul').endOf('day').toDate();

  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => ({
      updateOne: {
        filter: {
          type: rate.type,
          name: rate.name,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        update: {
          $set: {
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            date: rate.date,
          },
        },
        upsert: true,
      },
    }));

    try {
      const bulkWriteResult = await Rate.bulkWrite(bulkOps);
      console.log(
        `[${moment(date).format('YYYY-MM-DD')}] Currency - Matched: ${bulkWriteResult.matchedCount}, Upserted: ${bulkWriteResult.upsertedCount}`
      );
    } catch (err) {
      console.error('Bulk write sırasında hata oluştu:', err);
    }
  } else {
    console.log('Kaydedilecek veri bulunamadı.');
  }
};

// Altın verilerini parse etme ve kaydetme
const parseGoldData = async (html, type, date) => {
  const $ = cheerio.load(html);
  const rates = [];

  $('.table.gold tbody tr').each((index, element) => {
    const name = $(element).find('td:nth-child(1)').text().trim();
    if (name === '') return;

    const buyPrice = parseTL($(element).find('td:nth-child(3)').text());
    const sellPrice = parseTL($(element).find('td:nth-child(4)').text());

    if (buyPrice === null || sellPrice === null) {
      console.error(`Fiyat parse edilemedi: ${name} Tarih: ${moment(date).format('YYYY-MM-DD')}`);
      return;
    }

    const dateInTurkey = moment(date).tz('Europe/Istanbul').startOf('day').toDate();

    const rate = {
      type,
      name,
      buyPrice,
      sellPrice,
      date: dateInTurkey,
    };

    rates.push(rate);
  });

  const startOfDay = moment(date).tz('Europe/Istanbul').startOf('day').toDate();
  const endOfDay = moment(date).tz('Europe/Istanbul').endOf('day').toDate();

  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => ({
      updateOne: {
        filter: {
          type: rate.type,
          name: rate.name,
          date: { $gte: startOfDay, $lte: endOfDay },
        },
        update: {
          $set: {
            buyPrice: rate.buyPrice,
            sellPrice: rate.sellPrice,
            date: rate.date,
          },
        },
        upsert: true,
      },
    }));

    try {
      const bulkWriteResult = await Rate.bulkWrite(bulkOps);
      console.log(
        `[${moment(date).format('YYYY-MM-DD')}] Gold - Matched: ${bulkWriteResult.matchedCount}, Upserted: ${bulkWriteResult.upsertedCount}`
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

// VIEWSTATE değerini almak için (Currency)
const getCurrencyViewState = async () => {
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

// VIEWSTATE değerini almak için (Gold)
const getGoldViewState = async () => {
  try {
    const response = await axios.get('https://www.altinkaynak.com/Altin/Kur', {
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

// Ana fonksiyon - Currency güncelleme
const updateCurrencyData = async (startDate, endDate) => {
  const dates = getDateRange(startDate, endDate);
  console.log(`\n=== CURRENCY VERİLERİ ÇEKME BAŞLIYOR ===`);
  console.log(`Tarih aralığı: ${moment(startDate).format('YYYY-MM-DD')} - ${moment(endDate).format('YYYY-MM-DD')}`);
  console.log(`Toplam gün sayısı: ${dates.length}\n`);

  for (const date of dates) {
    const formattedDate = formatDate(date);
    console.log(`Veri çekiliyor: ${moment(date).format('YYYY-MM-DD')}`);

    try {
      const viewState = await getCurrencyViewState();

      const response = await axios.post(
        'https://www.altinkaynak.com/Doviz/Kur',
        `ctl00%24ctl00%24ScriptManager1=ctl00%24ctl00%24cphMain%24cphSubContent%24upValues%7Cctl00%24ctl00%24cphMain%24cphSubContent%24btnSearch&__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=${encodeURIComponent(
          viewState
        )}&__VIEWSTATEGENERATOR=B6A93912&ctl00%24ctl00%24cphMain%24cphSubContent%24dateInput=${formattedDate}&ctl00%24ctl00%24cphMain%24cphSubContent%24wccRange%24CallbackState=&cphMain_cphSubContent_pcHintWS=0%3A0%3A-1%3A-10000%3A-10000%3A0%3A131px%3A86px%3A1&DXScript=1_42%2C1_75%2C10_2%2C10_1%2C1_68%2C1_65&__ASYNCPOST=true&ctl00%24ctl00%24cphMain%24cphSubContent%24btnSearch=Getir`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            Accept: '*/*',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      const html = response.data;
      await parseCurrencyData(html, 'currency', date);
    } catch (err) {
      console.error(
        `Veri çekme hatası Tarih: ${moment(date).format('YYYY-MM-DD')}`,
        err.message
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 saniye bekleme
  }

  console.log('\n=== Currency verileri başarıyla güncellendi ===\n');
};

// Ana fonksiyon - Gold güncelleme
const updateGoldData = async (startDate, endDate) => {
  const dates = getDateRange(startDate, endDate);
  console.log(`\n=== GOLD VERİLERİ ÇEKME BAŞLIYOR ===`);
  console.log(`Tarih aralığı: ${moment(startDate).format('YYYY-MM-DD')} - ${moment(endDate).format('YYYY-MM-DD')}`);
  console.log(`Toplam gün sayısı: ${dates.length}\n`);

  for (const date of dates) {
    const formattedDate = formatDate(date);
    console.log(`Veri çekiliyor: ${moment(date).format('YYYY-MM-DD')}`);

    try {
      const viewState = await getGoldViewState();

      const response = await axios.post(
        'https://www.altinkaynak.com/Altin/Kur',
        `ctl00%24ctl00%24ScriptManager1=ctl00%24ctl00%24cphMain%24cphSubContent%24upValues%7Cctl00%24ctl00%24cphMain%24cphSubContent%24btnSearch&ctl00%24ctl00%24cphMain%24cphSubContent%24dateInput=${formattedDate}&ctl00%24ctl00%24cphMain%24cphSubContent%24wccRange%24CallbackState=&cphMain_cphSubContent_pcHintWS=0%3A0%3A-1%3A-10000%3A-10000%3A0%3A131px%3A86px%3A1&DXScript=1_42%2C1_75%2C10_2%2C10_1%2C1_68%2C1_65&__EVENTTARGET=&__EVENTARGUMENT=&__VIEWSTATE=${encodeURIComponent(
          viewState
        )}&__VIEWSTATEGENERATOR=AAA8014E&__ASYNCPOST=true&ctl00%24ctl00%24cphMain%24cphSubContent%24btnSearch=Getir`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            Accept: '*/*',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      const html = response.data;
      await parseGoldData(html, 'gold', date);
    } catch (err) {
      console.error(
        `Veri çekme hatası Tarih: ${moment(date).format('YYYY-MM-DD')}`,
        err.message
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 saniye bekleme
  }

  console.log('\n=== Gold verileri başarıyla güncellendi ===\n');
};

// Ana çalıştırma fonksiyonu
const runUpdate = async () => {
  try {
    // 7 Kasım 2024'ten bugüne kadar
    const startDate = new Date('2024-11-07');
    const endDate = new Date(); // Bugün

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   EKSİK VERİLERİ GÜNCELLEME İŞLEMİ BAŞLIYOR   ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Önce Currency verilerini çek
    await updateCurrencyData(startDate, endDate);

    // Sonra Gold verilerini çek
    await updateGoldData(startDate, endDate);

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║        TÜM VERİLER BAŞARIYLA GÜNCELLENDİ      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Hata oluştu:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Betiği çalıştır
runUpdate();

