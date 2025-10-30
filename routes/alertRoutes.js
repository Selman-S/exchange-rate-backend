// routes/alertRoutes.js

const express = require('express');
const router = express.Router();
const {
  getAlerts,
  getActiveAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  toggleAlert,
} = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

// Tüm route'lar authentication gerektiriyor
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Fiyat alarm yönetimi
 */

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Kullanıcının alarmlarını getirir
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, triggered, all]
 *         description: 'Filtre: active/triggered/all'
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/', getAlerts);

/**
 * @swagger
 * /api/alerts/active:
 *   get:
 *     summary: Aktif alarmları getirir
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Başarılı işlem
 */
router.get('/active', getActiveAlerts);

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Yeni alarm oluşturur
 *     tags: [Alerts]
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
 *               - condition
 *               - targetPrice
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [gold, currency]
 *               assetName:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [ABOVE, BELOW, EQUALS]
 *               targetPrice:
 *                 type: number
 *               priceField:
 *                 type: string
 *                 enum: [buyPrice, sellPrice]
 *                 default: sellPrice
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Alarm oluşturuldu
 */
router.post('/', createAlert);

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Alarm günceller
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alarm ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               condition:
 *                 type: string
 *                 enum: [ABOVE, BELOW, EQUALS]
 *               targetPrice:
 *                 type: number
 *               priceField:
 *                 type: string
 *                 enum: [buyPrice, sellPrice]
 *               note:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Alarm güncellendi
 */
router.put('/:id', updateAlert);

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Alarm siler
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alarm ID
 *     responses:
 *       200:
 *         description: Alarm silindi
 */
router.delete('/:id', deleteAlert);

/**
 * @swagger
 * /api/alerts/{id}/toggle:
 *   post:
 *     summary: Alarm aktif/pasif durumunu değiştirir
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Alarm ID
 *     responses:
 *       200:
 *         description: Alarm durumu değiştirildi
 */
router.post('/:id/toggle', toggleAlert);

module.exports = router;

