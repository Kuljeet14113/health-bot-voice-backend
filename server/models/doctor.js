import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
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
    type: String, 
    required: true 
  },
  specialization: { 
    type: String, 
    required: true 
  },
  experience: { 
    type: String, 
    required: true 
  },
  hospital: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
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
    default: 'doctor',
    enum: ['doctor']
  },
  medicalCertificate: {
    type: String, // file path or cloud URL
    required: true
  },
  identityCertificate: {
    type: String, // file path or cloud URL for identity proof
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  isApproved: {
    type: Boolean,
    default: false
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

export default mongoose.model('Doctor', doctorSchema);


