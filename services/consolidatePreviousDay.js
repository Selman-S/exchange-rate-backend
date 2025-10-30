// services/consolidatePreviousDay.js

const Rate = require('../models/Rate');
const moment = require('moment-timezone');

/**
 * Önceki günün saatlik kayıtlarını tek günlük kayda indirgeme
 * Her gece 00:01'de çalışır
 */
const consolidatePreviousDay = async () => {
  try {
    const now = moment().tz('Europe/Istanbul');
    const yesterday = moment().tz('Europe/Istanbul').subtract(1, 'day');
    
    const yesterdayStart = yesterday.startOf('day').toDate();
    const yesterdayEnd = yesterday.endOf('day').toDate();
    
    console.log('\n🔄 Önceki gün kayıtları birleştiriliyor...');
    console.log(`📅 Tarih: ${yesterday.format('DD.MM.YYYY')}`);
    console.log(`⏰ İşlem zamanı: ${now.format('DD.MM.YYYY HH:mm:ss')}\n`);
    
    // Dünün tüm saatlik kayıtlarını getir (varlık bazlı gruplama)
    const yesterdayRates = await Rate.find({
      date: { $gte: yesterdayStart, $lte: yesterdayEnd }
    }).sort({ date: -1 }); // En son kayıtlar önce
    
    if (yesterdayRates.length === 0) {
      console.log('⚠️  Önceki güne ait kayıt bulunamadı.\n');
      return;
    }
    
    console.log(`📊 Toplam ${yesterdayRates.length} saatlik kayıt bulundu.`);
    
    // Her varlık için en son fiyatı bul (varlık bazlı gruplama)
    const consolidatedRates = {};
    
    yesterdayRates.forEach(rate => {
      const key = `${rate.type}-${rate.name}`;
      
      // İlk karşılaşma (en son kayıt çünkü sort edildi)
      if (!consolidatedRates[key]) {
        consolidatedRates[key] = {
          type: rate.type,
          name: rate.name,
          buyPrice: rate.buyPrice,
          sellPrice: rate.sellPrice,
          date: yesterday.startOf('day').toDate(), // Sadece tarih, saat yok
        };
      }
    });
    
    const consolidatedArray = Object.values(consolidatedRates);
    
    console.log(`🔹 ${consolidatedArray.length} farklı varlık bulundu.`);
    console.log(`🗑️  ${yesterdayRates.length} saatlik kayıt silinecek...`);
    
    // Eski saatlik kayıtları sil
    const deleteResult = await Rate.deleteMany({
      date: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });
    
    console.log(`✅ ${deleteResult.deletedCount} saatlik kayıt silindi.`);
    
    // Tek günlük kayıtları ekle
    if (consolidatedArray.length > 0) {
      const insertResult = await Rate.insertMany(consolidatedArray);
      console.log(`✅ ${insertResult.length} günlük kayıt oluşturuldu.`);
      
      // İlk 3 örnek göster
      consolidatedArray.slice(0, 3).forEach(rate => {
        console.log(`  • ${rate.name}: ${rate.sellPrice.toFixed(2)} TL`);
      });
      if (consolidatedArray.length > 3) {
        console.log(`  ... ve ${consolidatedArray.length - 3} varlık daha`);
      }
    }
    
    console.log('\n🎉 Önceki gün başarıyla birleştirildi!');
    console.log('========================================\n');
    
  } catch (err) {
    console.error('❌ Consolidation hatası:', err.message);
    console.log('========================================\n');
  }
};

module.exports = consolidatePreviousDay;

