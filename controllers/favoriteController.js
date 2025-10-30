// controllers/favoriteController.js

const Favorite = require('../models/Favorite');

// @desc    Kullanıcının tüm favorilerini getir
// @route   GET /api/favorites
// @access  Private
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: favorites.length,
      data: favorites,
    });
  } catch (err) {
    console.error('❌ Get Favorites Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Favori ekle
// @route   POST /api/favorites
// @access  Private
exports.addFavorite = async (req, res) => {
  try {
    const { assetType, assetName } = req.body;

    // Validation
    if (!assetType || !assetName) {
      return res.status(400).json({
        success: false,
        error: 'Varlık türü ve adı gereklidir',
      });
    }

    if (!['gold', 'currency'].includes(assetType)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz varlık türü',
      });
    }

    // Check if already exists
    const existingFavorite = await Favorite.findOne({
      user: req.user.id,
      assetType,
      assetName,
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        error: 'Bu varlık zaten favorilerinizde',
      });
    }

    // Get max order for this user
    const maxOrderFavorite = await Favorite.findOne({ user: req.user.id })
      .sort({ order: -1 })
      .select('order');

    const newOrder = maxOrderFavorite ? maxOrderFavorite.order + 1 : 0;

    // Create favorite
    const favorite = await Favorite.create({
      user: req.user.id,
      assetType,
      assetName,
      order: newOrder,
    });

    console.log(`✅ Favori eklendi: ${assetName} (User: ${req.user.id})`);

    res.status(201).json({
      success: true,
      data: favorite,
    });
  } catch (err) {
    console.error('❌ Add Favorite Error:', err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Bu varlık zaten favorilerinizde',
      });
    }
    
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Favori sil
// @route   DELETE /api/favorites/:id
// @access  Private
exports.deleteFavorite = async (req, res) => {
  try {
    const favorite = await Favorite.findById(req.params.id);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: 'Favori bulunamadı',
      });
    }

    // Check ownership
    if (favorite.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Bu favoriyi silme yetkiniz yok',
      });
    }

    await favorite.deleteOne();

    console.log(`✅ Favori silindi: ${favorite.assetName} (User: ${req.user.id})`);

    res.status(200).json({
      success: true,
      message: 'Favori silindi',
    });
  } catch (err) {
    console.error('❌ Delete Favorite Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    Favorileri yeniden sırala
// @route   PUT /api/favorites/reorder
// @access  Private
exports.reorderFavorites = async (req, res) => {
  try {
    const { favorites } = req.body;

    // Validation
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir favori listesi gönderilmelidir',
      });
    }

    // Bulk update
    const bulkOps = favorites.map(fav => ({
      updateOne: {
        filter: { _id: fav.id, user: req.user.id },
        update: { $set: { order: fav.order } },
      },
    }));

    await Favorite.bulkWrite(bulkOps);

    console.log(`✅ Favoriler yeniden sıralandı (User: ${req.user.id})`);

    res.status(200).json({
      success: true,
      message: 'Favoriler yeniden sıralandı',
    });
  } catch (err) {
    console.error('❌ Reorder Favorites Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

// @desc    LocalStorage'dan favorileri migrate et
// @route   POST /api/favorites/migrate
// @access  Private
exports.migrateFavorites = async (req, res) => {
  try {
    const { favorites } = req.body;

    // Validation
    if (!Array.isArray(favorites)) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir favori listesi gönderilmelidir',
      });
    }

    // Check if user already has favorites
    const existingCount = await Favorite.countDocuments({ user: req.user.id });

    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Zaten favorileriniz var',
        message: 'Migration gerekmiyor',
      });
    }

    // Import favorites from localStorage
    // Format: ["Gram Altın", "Amerikan Doları", ...]
    const Rate = require('../models/Rate');
    const favoritesToCreate = [];

    for (let i = 0; i < favorites.length; i++) {
      const assetName = favorites[i];
      
      // Find asset type by querying Rate collection
      const rate = await Rate.findOne({ name: assetName }).select('type');
      
      if (rate) {
        favoritesToCreate.push({
          user: req.user.id,
          assetType: rate.type,
          assetName: assetName,
          order: i,
        });
      }
    }

    if (favoritesToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli favori bulunamadı',
      });
    }

    // Bulk insert
    const insertedFavorites = await Favorite.insertMany(favoritesToCreate, { ordered: false });

    console.log(`✅ ${insertedFavorites.length} favori migrate edildi (User: ${req.user.id})`);

    res.status(200).json({
      success: true,
      message: `${insertedFavorites.length} favori başarıyla aktarıldı`,
      count: insertedFavorites.length,
      data: insertedFavorites,
    });
  } catch (err) {
    console.error('❌ Migrate Favorites Error:', err);
    res.status(500).json({ success: false, error: 'Sunucu hatası', details: err.message });
  }
};

