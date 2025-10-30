// controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Kullanıcı kaydı
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validasyon
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen tüm alanları doldurun',
      });
    }

    // Kullanıcı zaten var mı?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Bu email adresi zaten kullanılıyor',
      });
    }

    // Yeni kullanıcı oluştur (User model'deki pre('save') hook şifreyi otomatik hashleyecek)
    const user = await User.create({
      name,
      email,
      password,
    });

    // JWT token oluştur
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });

    console.log(`✅ Yeni kullanıcı kaydı: ${user.email}`);

    res.status(201).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('❌ Register Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};

// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kullanıcı var mı?
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz email veya şifre',
      });
    }

    // Şifre doğru mu?
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz email veya şifre',
      });
    }

    // JWT token oluştur
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};

// @desc    Mevcut kullanıcı bilgilerini getir
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
};

// @desc    Şifre değiştir
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mevcut şifre ve yeni şifre gereklidir',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre en az 6 karakter olmalıdır',
      });
    }

    // Kullanıcıyı bul (password dahil)
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Mevcut şifre doğru mu?
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        error: 'Mevcut şifre yanlış',
      });
    }

    // Yeni şifre mevcut şifre ile aynı mı?
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'Yeni şifre mevcut şifre ile aynı olamaz',
      });
    }

    // Yeni şifreyi kaydet (User model'deki pre('save') hook otomatik hashleyecek)
    user.password = newPassword;
    await user.save();

    console.log(`✅ Kullanıcı şifresi değiştirildi: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
    });
  } catch (err) {
    console.error('❌ Change Password Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @desc    Email değiştir
// @route   PUT /api/auth/change-email
// @access  Private
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    // Validation
    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Yeni email ve şifre gereklidir',
      });
    }

    // Email formatı kontrolü (basit)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz email formatı',
      });
    }

    // Kullanıcıyı bul (password dahil)
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Kullanıcı bulunamadı',
      });
    }

    // Şifre doğru mu?
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        error: 'Şifre yanlış',
      });
    }

    // Email zaten kullanımda mı?
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Bu email adresi zaten kullanılıyor',
      });
    }

    // Email'i güncelle
    user.email = newEmail;
    await user.save();

    console.log(`✅ Kullanıcı email'i değiştirildi: ${newEmail}`);

    res.status(200).json({
      success: true,
      message: 'Email başarıyla değiştirildi',
      data: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('❌ Change Email Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
