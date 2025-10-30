// routes/rateRoutes.js

const express = require('express');
const router = express.Router();
const {
    getRates,
    getAssetNamesByType,
    getPriceAtDate,
    getHourlyRates,
    getPriceChange,
    getComparisonData,
    calculateReturn,
  } = require('../controllers/rateController');

/**
 * @swagger
 * tags:
 *   name: Rates
 *   description: Altın ve döviz kurları
 */

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: Altın ve döviz kurlarını getirir
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Türü: gold veya currency'
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: false
 *         description: 'Varlık adı: USD, Gram Altın vb.'
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 'Başlangıç tarihi (YYYY-MM-DD)'
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 'Bitiş tarihi (YYYY-MM-DD)'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rate'
 */

router.get('/', getRates);


/**
 * @swagger
 * /api/rates/names:
 *   get:
 *     summary: Belirli bir türe göre en son tarihli varlık adlarını getirir
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık türü (gold veya currency)'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/names', getAssetNamesByType);

/**
 * @swagger
 * /api/rates/price-at:
 *   get:
 *     summary: Belirli bir tarihteki fiyatı getirir
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık türü (gold veya currency)'
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık adı (örn: Amerikan Doları)'
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: 'Tarih (YYYY-MM-DD formatında)'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     requestedDate:
 *                       type: string
 *                     actualDate:
 *                       type: string
 *                     buyPrice:
 *                       type: number
 *                     sellPrice:
 *                       type: number
 *                     isExactMatch:
 *                       type: boolean
 *                     message:
 *                       type: string
 *       400:
 *         description: Geçersiz parametreler
 *       404:
 *         description: Veri bulunamadı
 */
router.get('/price-at', getPriceAtDate);

/**
 * @swagger
 * /api/rates/hourly:
 *   get:
 *     summary: Saatlik veri getirir (bugün veya belirli bir gün)
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 'Tarih (YYYY-MM-DD formatında, default: bugün)'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/hourly', getHourlyRates);

/**
 * @swagger
 * /api/rates/change:
 *   get:
 *     summary: Haftalık/Aylık değişim hesapla
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık türü (gold veya currency)'
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık adı'
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly, 1d, 1w, 1m, 1y]
 *         required: true
 *         description: 'Dönem'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/change', getPriceChange);

/**
 * @swagger
 * /api/rates/comparison:
 *   get:
 *     summary: Karşılaştırma grafiği için veri
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: assets
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlıklar (currency-Dolar,gold-Gram Altın)'
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: 'Başlangıç tarihi'
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: 'Bitiş tarihi'
 *       - in: query
 *         name: normalize
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         required: false
 *         description: 'Normalize et (100 bazlı)'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/comparison', getComparisonData);

/**
 * @swagger
 * /api/rates/calculate-return:
 *   post:
 *     summary: Getiri hesaplama simülatörü
 *     tags: [Rates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - assetName
 *               - amount
 *               - investmentDate
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [gold, currency]
 *               assetName:
 *                 type: string
 *               amount:
 *                 type: number
 *               investmentDate:
 *                 type: string
 *                 format: date
 *               comparisonDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.post('/calculate-return', calculateReturn);

/**
 * @swagger
 * /api/rates/hourly:
 *   get:
 *     summary: Saatlik fiyat verilerini getirir
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: 'Tarih (YYYY-MM-DD). Default: bugün'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/hourly', getHourlyRates);

/**
 * @swagger
 * /api/rates/change:
 *   get:
 *     summary: Fiyat değişim yüzdesini getirir (günlük/haftalık/aylık/yıllık)
 *     tags: [Rates]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [gold, currency]
 *         required: true
 *         description: 'Varlık türü'
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: 'Varlık adı'
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *         required: true
 *         description: 'Zaman aralığı'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/change', getPriceChange);

module.exports = router;
