const express = require('express');
const router = express.Router();
const {
  createPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioSummary,
  getPortfolioValueSeries,
} = require('../controllers/portfolioController');

const { protect } = require('../middleware/auth');

// Portföy varlıklarıyla ilgili rotaları içe aktar
const assetRouter = require('./assetRoutes');

// Rota koruması ekleyin
router.use(protect);

// Portföy varlıkları için yönlendirme
router.use('/:portfolioId/assets', assetRouter);

/**
 * @swagger
 * tags:
 *   name: Portfolios
 *   description: Kullanıcı portföy yönetimi
 */

/**
 * @swagger
 * /api/portfolios:
 *   get:
 *     summary: Kullanıcının tüm portföylerini getirir
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
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
 *                     $ref: '#/components/schemas/Portfolio'
 *   post:
 *     summary: Yeni bir portföy oluşturur
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PortfolioInput'
 *     responses:
 *       201:
 *         description: Portföy başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Portfolio'
 */

router
  .route('/')
  .get(getPortfolios)
  .post(createPortfolio);

/**
 * @swagger
 * /api/portfolios/{id}:
 *   get:
 *     summary: Belirli bir portföyü getirir
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
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
 *                   $ref: '#/components/schemas/Portfolio'
 *   put:
 *     summary: Belirli bir portföyü günceller
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PortfolioInput'
 *     responses:
 *       200:
 *         description: Portföy başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Portfolio'
 *   delete:
 *     summary: Belirli bir portföyü siler
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *     responses:
 *       200:
 *         description: Portföy başarıyla silindi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Boş nesne
 *                 message:
 *                   type: string
 *                   description: İşlem mesajı
 */

router
  .route('/:id')
  .get(getPortfolio)
  .put(updatePortfolio)
  .delete(deletePortfolio);

/**
 * @swagger
 * /api/portfolios/{id}/summary:
 *   get:
 *     summary: Portföy özetini getirir (toplam değer, kar/zarar)
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
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
 *                     portfolioId:
 *                       type: string
 *                     portfolioName:
 *                       type: string
 *                     totalCost:
 *                       type: number
 *                     totalValue:
 *                       type: number
 *                     pnl:
 *                       type: number
 *                     pnlPercent:
 *                       type: number
 *                     assetCount:
 *                       type: integer
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Portföy bulunamadı
 */
router.get('/:id/summary', getPortfolioSummary);

/**
 * @swagger
 * /api/portfolios/{id}/value-series:
 *   get:
 *     summary: Portföyün tarihsel değer serisini getirir
 *     tags: [Portfolios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1W, 1M, 3M, 6M, 1Y, 3Y, ALL]
 *         description: Zaman aralığı - 1W(1 hafta), 1M(1 ay), 3M(3 ay), 6M(6 ay/varsayılan), 1Y(1 yıl), 3Y(3 yıl), ALL(tümü)
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
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       value:
 *                         type: number
 *                       change:
 *                         type: number
 *       404:
 *         description: Portföy bulunamadı
 */
router.get('/:id/value-series', getPortfolioValueSeries);

module.exports = router;
