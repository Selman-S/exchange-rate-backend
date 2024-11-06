const express = require('express');
const router = express.Router();
const {
  createPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
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

module.exports = router;
