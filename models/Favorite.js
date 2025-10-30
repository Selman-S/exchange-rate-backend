// models/Favorite.js

const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Kullanıcı gereklidir'],
      index: true,
    },
    assetType: {
      type: String,
      enum: ['gold', 'currency'],
      required: [true, 'Varlık türü gereklidir'],
    },
    assetName: {
      type: String,
      required: [true, 'Varlık adı gereklidir'],
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: Bir kullanıcı aynı varlığı bir kere favorilesin
FavoriteSchema.index({ user: 1, assetType: 1, assetName: 1 }, { unique: true });

// Index for ordering
FavoriteSchema.index({ user: 1, order: 1 });

module.exports = mongoose.model('Favorite', FavoriteSchema);
