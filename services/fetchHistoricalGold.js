// services/fetchHistoricalGold.js

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Rate = require('../models/Rate'); // Rate modelinin doğru yolu
require('dotenv').config();

// Veritabanı bağlantısı
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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

    const rate = {
      type: type, // 'gold'
      name: name,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      date: date,
    };

    rates.push(rate);
  });

//   console.log(rates);

  // Veritabanına kaydetme
  for (const rate of rates) {
    try {
      await Rate.findOneAndUpdate(
        { type: rate.type, name: rate.name, date: rate.date },
        rate,
        { upsert: true, new: true }
      );
      console.log(`Kaydedildi: ${rate.name} Tarih: ${rate.date.toISOString().split('T')[0]}`);
    } catch (err) {
      console.error(`Veritabanına kaydedilemedi: ${rate.name} Tarih: ${rate.date.toISOString().split('T')[0]}`, err);
    }
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
const fetchHistoricalGoldRates = async () => {
  const startDate = new Date('2023-01-01');
//   const endDate = new Date('2023-01-03'); // Bugünün tarihi
  const endDate = new Date(); // Bugünün tarihi

  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    const formattedDate = formatDate(date);
    console.log(`Fetching data for: ${date.toISOString().split('T')[0]}`);

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
      console.error(`Veri çekme hatası Tarih: ${date.toISOString().split('T')[0]}`, err.message);
    }

    // Sunucuya aşırı yük binmemesi için kısa bir gecikme ekleyebilirsiniz
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 saniye bekleme
  }

  console.log('Tüm veriler başarıyla çekildi ve kaydedildi');
  mongoose.disconnect();
};

// Betiği çalıştırma
fetchHistoricalGoldRates();
