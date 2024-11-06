const User = require('../models/User');
const jwt = require('jsonwebtoken');


// Kullanıcı kayıt
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.create({
      name,
      email,
      password,
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {    
    res.status(400).json({ success: false, error: err.message });
  }
};

// Mevcut kullanıcıyı al
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // `req.user` protect middleware'i tarafından ayarlanır
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};

// Kullanıcı giriş
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Email ve şifre kontrolü
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, error: 'Lütfen email ve şifre girin' });
  }

  // Kullanıcıyı bulma
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res
      .status(401)
      .json({ success: false, error: 'Geçersiz kimlik bilgileri' });
  }

  // Şifre doğrulama
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, error: 'Geçersiz kimlik bilgileri' });
  }

  sendTokenResponse(user, 200, res);
};



// JWT token oluşturma ve yanıt olarak gönderme
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const userNotPassword = user.toObject();
  delete userNotPassword.password;

  res.status(statusCode).json({
    success: true,
    data:userNotPassword,
    token,
  });
};
