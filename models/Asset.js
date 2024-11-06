const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.ObjectId,
      ref: 'Portfolio',
      required: true,
    },
    type: {
      type: String,
      required: [true, 'Varlık türü gereklidir'], // 'gold' veya 'currency'
    },
    name: {
      type: String,
      required: [true, 'Varlık adı gereklidir'],
    },
    amount: {
      type: Number,
      required: [true, 'Miktar gereklidir'],
    },
    costPrice: {
      type: Number,
      required: [true, 'Maliyet fiyatı gereklidir'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Alış tarihi gereklidir'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', AssetSchema);
