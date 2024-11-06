const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // 'gold' veya 'currency'
    name: { type: String, required: true }, // Örneğin, 'USD', 'Gram Altın' vb.
    buyPrice: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rate', rateSchema);
