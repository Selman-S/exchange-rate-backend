// routes/favoriteRoutes.js

const express = require('express');
const router = express.Router();
const {
  getFavorites,
  addFavorite,
  deleteFavorite,
  reorderFavorites,
  migrateFavorites,
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

// Tüm route'lar authentication gerektiriyor
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Favori varlık yönetimi
 */

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Kullanıcının favori listesini getirir
 *     tags: [Favorites]
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       user:
 *                         type: string
 *                       assetType:
 *                         type: string
 *                         enum: [gold, currency]
 *                       assetName:
 *                         type: string
 *                       order:
 *                         type: integer
 */
router.get('/', getFavorites);

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Favori ekler
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetType
 *               - assetName
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [gold, currency]
 *               assetName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Favori eklendi
 */
router.post('/', addFavorite);

/**
 * @swagger
 * /api/favorites/{id}:
 *   delete:
 *     summary: Favori siler
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Favori ID'si
 *     responses:
 *       200:
 *         description: Favori silindi
 */
router.delete('/:id', deleteFavorite);

/**
 * @swagger
 * /api/favorites/reorder:
 *   put:
 *     summary: Favorileri yeniden sıralar
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - favorites
 *             properties:
 *               favorites:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Sıralama güncellendi
 */
router.put('/reorder', reorderFavorites);

/**
 * @swagger
 * /api/favorites/migrate:
 *   post:
 *     summary: LocalStorage'dan favorileri migrate eder
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - favorites
 *             properties:
 *               favorites:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Varlık adları array'i
 *     responses:
 *       200:
 *         description: Migration tamamlandı
 */
router.post('/migrate', migrateFavorites);

module.exports = router;

