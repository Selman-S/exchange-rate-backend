const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'İsim gereklidir'],
    },
    email: {
      type: String,
      required: [true, 'Email gereklidir'],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Lütfen geçerli bir email girin',
      ],
    },
    password: {
      type: String,
      required: [true, 'Şifre gereklidir'],
      minlength: 6,
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Şifreyi hashleme
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Şifreyi karşılaştırma
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token oluşturma
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = mongoose.model('User', UserSchema);
