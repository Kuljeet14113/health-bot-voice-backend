import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'patient',
    enum: ['patient', 'doctor', 'admin']
  },
  tokens: [
    {
      token: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
