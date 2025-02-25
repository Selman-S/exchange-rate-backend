// routes/rateRoutes.js

const express = require('express');
const router = express.Router();
const {
    getRates,
    getAssetNamesByType, // Yeni eklenen fonksiyon
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

module.exports = router;
