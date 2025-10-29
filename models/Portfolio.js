const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Portföy adı gereklidir'],
      trim: true,
      minlength: [3, 'Portföy adı en az 3 karakter olmalıdır'],
      maxlength: [40, 'Portföy adı en fazla 40 karakter olabilir'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Açıklama en fazla 200 karakter olabilir'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', PortfolioSchema);
