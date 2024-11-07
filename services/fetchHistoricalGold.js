// services/fetchHistoricalGold.js

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Rate = require('../models/Rate'); // Rate modelinin doğru yolu
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

  // Binlik ayırıcı olan noktaları kaldır
  sanitized = sanitized.replace(/\./g, '');

  // Ondalık virgülü noktaya çevir
  sanitized = sanitized.replace(/,/g, '.');

  // Sadece rakam, nokta ve eksi işaretine izin ver
  sanitized = sanitized.replace(/[^0-9.-]/g, '');

  // Sayıya dönüştür
  const number = parseFloat(sanitized);

  if (isNaN(number)) {
    console.error('Dönüştürülemeyen sayı:', tlString);
    return null;
  }

  return number;
};

// HTML'den veriyi parse etme ve kaydetme
const parseAndSaveData = async (html, type, date) => {
  const $ = cheerio.load(html);
  const rates = [];

  $('.table.gold tbody tr').each((index, element) => {
    const name = $(element).find('td:nth-child(1)').text().trim();
    if (name === '') return;

    const buyPrice = parseTL($(element).find('td:nth-child(3)').text());
    const sellPrice = parseTL($(element).find('td:nth-child(4)').text());

    if (buyPrice === null || sellPrice === null) {
      console.error(`Fiyat parse edilemedi: ${name} Tarih: ${date}`);
      return;
    }

    // Türkiye saat diliminde tarih oluşturma
    const dateInTurkey = moment(date).tz('Europe/Istanbul').startOf('day').toDate();

    const rate = {
      type: type, // 'gold'
      name: name,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      date: dateInTurkey,
    };

    rates.push(rate);
  });

  // İlgili tarihin başlangıcı ve sonunu belirleme
  const startOfDay = moment(date).tz('Europe/Istanbul').startOf('day').toDate();
  const endOfDay = moment(date).tz('Europe/Istanbul').endOf('day').toDate();

  // Veritabanına kaydetme (bulkWrite kullanarak)
  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => {
      return {
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
          upsert: true, // Kayıt yoksa oluştur
        },
      };
    });

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
    const response = await axios.get('https://www.altinkaynak.com/Altin/Kur', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
exports.fetchHistoricalGoldRates = async () => {
  const startDate = new Date('2002-01-01');
  const endDate = new Date('2012-01-01'); // İhtiyacınıza göre ayarlayın
  // const endDate = new Date(); // Bugünün tarihi

  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    const formattedDate = formatDate(date);
    console.log(`Veri çekiliyor: ${moment(date).format('YYYY-MM-DD')}`);

    try {
      const viewState = await getViewState();

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
      await parseAndSaveData(html, 'gold', date);
    } catch (err) {
      console.error(
        `Veri çekme hatası Tarih: ${moment(date).format('YYYY-MM-DD')}`,
        err.message
      );
    }

    // Sunucuya aşırı yük binmemesi için kısa bir gecikme ekleyebilirsiniz
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 saniye bekleme
  }

  console.log('Tüm veriler başarıyla çekildi ve kaydedildi');
  mongoose.disconnect();
};

// Betiği çalıştırma
// fetchHistoricalGoldRates();
