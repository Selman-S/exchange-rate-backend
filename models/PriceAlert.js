// models/PriceAlert.js

const mongoose = require('mongoose');

const PriceAlertSchema = new mongoose.Schema(
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
    condition: {
      type: String,
      enum: ['ABOVE', 'BELOW', 'EQUALS'],
      required: [true, 'Koşul gereklidir'],
    },
    targetPrice: {
      type: Number,
      required: [true, 'Hedef fiyat gereklidir'],
      min: [0, 'Hedef fiyat sıfırdan küçük olamaz'],
    },
    priceField: {
      type: String,
      enum: ['buyPrice', 'sellPrice'],
      default: 'sellPrice',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTriggered: {
      type: Boolean,
      default: false,
    },
    triggeredAt: {
      type: Date,
    },
    note: {
      type: String,
      maxlength: 200,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
PriceAlertSchema.index({ user: 1, isActive: 1 });
PriceAlertSchema.index({ isActive: 1, isTriggered: 1 });
PriceAlertSchema.index({ user: 1, assetType: 1, assetName: 1 });

module.exports = mongoose.model('PriceAlert', PriceAlertSchema);

