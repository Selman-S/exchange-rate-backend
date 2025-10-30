const express = require('express');
const router = express.Router({ mergeParams: true }); // portfolioId'yi parent'tan al
const {
  getTransactions,
  createTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

// Tüm route'lar protected
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Portföy işlem yönetimi
 */

/**
 * @swagger
 * /api/portfolios/{portfolioId}/transactions:
 *   get:
 *     summary: Portföy işlemlerini listeler
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: portfolioId
 *         schema:
 *           type: string
 *         required: true
 *         description: Portföy ID'si
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Varlık adında arama
 *       - in: query
 *         name: side
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
 *         description: İşlem türü filtresi
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına kayıt sayısı
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
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *   post:
 *     summary: Yeni işlem ekler
 *     tags: [Transactions]
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
 *             type: object
 *             required:
 *               - side
 *               - assetType
 *               - assetName
 *               - amount
 *               - price
 *             properties:
 *               assetId:
 *                 type: string
 *                 description: İlişkili asset ID (opsiyonel)
 *               side:
 *                 type: string
 *                 enum: [BUY, SELL]
 *               assetType:
 *                 type: string
 *                 enum: [gold, currency]
 *               assetName:
 *                 type: string
 *               amount:
 *                 type: number
 *               price:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *               priceMode:
 *                 type: string
 *                 enum: [AUTO, MANUAL]
 *     responses:
 *       201:
 *         description: İşlem başarıyla oluşturuldu
 */
router
  .route('/')
  .get(getTransactions)
  .post(createTransaction);

/**
 * @swagger
 * /api/portfolios/{portfolioId}/transactions/{transactionId}:
 *   delete:
 *     summary: İşlemi siler
 *     tags: [Transactions]
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
 *         name: transactionId
 *         schema:
 *           type: string
 *         required: true
 *         description: İşlem ID'si
 *     responses:
 *       200:
 *         description: İşlem başarıyla silindi
 */
router
  .route('/:transactionId')
  .delete(deleteTransaction);

module.exports = router;

