const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    portfolio: {
      type: mongoose.Schema.ObjectId,
      ref: 'Portfolio',
      required: [true, 'Portföy bilgisi gereklidir'],
      index: true,
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: 'Asset',
      // Asset silinirse null kalabilir
    },
    side: {
      type: String,
      enum: {
        values: ['BUY', 'SELL'],
        message: 'İşlem türü BUY veya SELL olmalıdır',
      },
      required: [true, 'İşlem türü gereklidir'],
    },
    assetType: {
      type: String,
      enum: {
        values: ['gold', 'currency'],
        message: 'Varlık türü gold veya currency olmalıdır',
      },
      required: [true, 'Varlık türü gereklidir'],
    },
    assetName: {
      type: String,
      required: [true, 'Varlık adı gereklidir'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Miktar gereklidir'],
      min: [0.000001, 'Miktar 0\'dan büyük olmalıdır'],
    },
    price: {
      type: Number,
      required: [true, 'Fiyat gereklidir'],
      min: [0.01, 'Fiyat 0\'dan büyük olmalıdır'],
    },
    totalValue: {
      type: Number,
      required: [true, 'Toplam değer gereklidir'],
    },
    date: {
      type: Date,
      required: [true, 'İşlem tarihi gereklidir'],
      index: true,
    },
    note: {
      type: String,
      maxlength: [500, 'Not en fazla 500 karakter olabilir'],
      trim: true,
    },
    priceMode: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      default: 'AUTO',
    },
  },
  { 
    timestamps: true,
  }
);

// Compound indexes for better query performance
TransactionSchema.index({ portfolio: 1, date: -1 });
TransactionSchema.index({ portfolio: 1, assetName: 1 });
TransactionSchema.index({ portfolio: 1, side: 1 });

// Virtual: formatted date
TransactionSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Virtual: formatted total value
TransactionSchema.virtual('formattedTotal').get(function() {
  return `${this.totalValue.toFixed(2)} ₺`;
});

module.exports = mongoose.model('Transaction', TransactionSchema);

