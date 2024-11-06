// routes/assetRoutes.js

const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createAsset,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
} = require('../controllers/assetController');

const { protect } = require('../middleware/auth');

// Rota koruması ekleyin
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Assets
 *   description: Portföy varlık yönetimi
 */

/**
 * @swagger
 * /api/portfolios/{portfolioId}/assets:
 *   get:
 *     summary: Belirli bir portföydeki tüm varlıkları getirir
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
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
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asset'
 *   post:
 *     summary: Belirli bir portföye yeni bir varlık ekler
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       201:
 *         description: Varlık başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Asset'
 */

router
  .route('/')
  .get(getAssets)
  .post(createAsset);

/**
 * @swagger
 * /api/portfolios/{portfolioId}/assets/{assetId}:
 *   get:
 *     summary: Belirli bir varlığı getirir
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *       - in: path
 *         name: assetId
 *         schema:
 *           type: string
 *         required: true
 *         description: Varlık ID'si
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
 *                   $ref: '#/components/schemas/Asset'
 *   put:
 *     summary: Belirli bir varlığı günceller
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *       - in: path
 *         name: assetId
 *         schema:
 *           type: string
 *         required: true
 *         description: Varlık ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       200:
 *         description: Varlık başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Asset'
 *   delete:
 *     summary: Belirli bir varlığı siler
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *       - in: path
 *         name: assetId
 *         schema:
 *           type: string
 *         required: true
 *         description: Varlık ID'si
 *     responses:
 *       200:
 *         description: Varlık başarıyla silindi
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
  .route('/:assetId')
  .get(getAsset)
  .put(updateAsset)
  .delete(deleteAsset);

module.exports = router;
