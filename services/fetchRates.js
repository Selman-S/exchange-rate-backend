// services/fetchRates.js

const axios = require('axios');
const cheerio = require('cheerio');
const Rate = require('../models/Rate');
require('dotenv').config();

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

function parseTL(tlString) {
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
}

const parseAndSaveData = async (html, type) => {
  const $ = cheerio.load(html);
  const rates = [];
  
  // Tabloyu seçme (sitenin HTML yapısına göre ayarlamanız gerekebilir)
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

    const rate = {
      type,
      name,
      buyPrice,
      sellPrice,
      date: new Date(), // Bugünün tarihi ve saati
    };
    rates.push(rate);
  });

  // Bugünün başlangıcı ve sonunu belirleme
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Veritabanına kaydetme (bulkWrite kullanarak)
  if (rates.length > 0) {
    const bulkOps = rates.map((rate) => {
      return {
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

module.exports = fetchRates;
