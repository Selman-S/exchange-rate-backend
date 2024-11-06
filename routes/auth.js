const express = require('express');
const router = express.Router();
const { register, login,getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Kullanıcı kimlik doğrulama işlemleri
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Kullanıcının tam adı
 *               email:
 *                 type: string
 *                 description: Kullanıcının email adresi
 *               password:
 *                 type: string
 *                 description: Kullanıcının şifresi
 *     responses:
 *       201:
 *         description: Başarılı kayıt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 */

router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Kullanıcının email adresi
 *               password:
 *                 type: string
 *                 description: Kullanıcının şifresi
 *     responses:
 *       200:
 *         description: Başarılı giriş
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 */

router.post('/login', login);


// Mevcut kullanıcıyı alma rotası





router.get('/me', protect, getMe);

module.exports = router;
