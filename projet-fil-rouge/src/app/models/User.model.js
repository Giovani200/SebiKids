import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: Number,
    required: true,
    min: 4,
    max: 120,
  },

  avatar: {
    type: String,
    default: "", // ou une URL par défaut
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  parentEmail: {
    type: String,
    required: function () {
      return this.age < 13;
    },
    lowercase: true,
  },
  isActivated: {
    type: Boolean,
    default: false,
  },
  activationTokenHash: {
    type: String,
    index: true,
  },
  activationExpiresAt: {
    type: Date,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: {
    type: String,
    index: true,
  },
  resetPasswordExpires: {
    type: Date
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

