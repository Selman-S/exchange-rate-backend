// middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Header'da Authorization varsa token'ı al
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Token yoksa hata döndür
  if (!token) {
    return res.status(401).json({ success: false, error: 'Yetkisiz erişim' });
  }

  try {
    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcıyı yükle ve `req.user`'a ata
    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, error: 'Yetkisiz erişim' });
  }
};
