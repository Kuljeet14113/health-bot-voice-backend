import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Making it optional for backward compatibility
  },
  patientName: {
    type: String,
    required: true
  },
  patientEmail: {
    type: String,
    required: true
  },
  patientPhone: {
    type: String,
    required: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  patientGender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  
  // Doctor Information
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  doctorEmail: {
    type: String,
    required: true
  },
  doctorSpecialization: {
    type: String,
    required: true
  },
  doctorHospital: {
    type: String,
    required: true
  },
  
  // Appointment Details
  appointmentDate: {
    type: Date,
    required: true
  },
  // Normalized day for uniqueness guard (start of day in server timezone)
  appointmentDay: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  symptoms: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'confirmed', 'cancelled', 'completed', 'rescheduled'],
    default: 'pending'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional Information
  isUrgent: {
    type: Boolean,
    default: false
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  prescription: {
    type: String,
    default: ''
  },
  medicines: {
    type: String,
    default: ''
  },
  diagnosis: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientEmail: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ doctorId: 1, patientId: 1 });
appointmentSchema.index({ status: 1 });

// Unique guard: prevent double booking for the same doctor/day/time for active (pending/confirmed) appointments
appointmentSchema.index(
  { doctorId: 1, appointmentDay: 1, appointmentTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] }, appointmentDay: { $exists: true } }
  }
);

// Pre-validate to ensure appointmentDay is set from appointmentDate
appointmentSchema.pre('validate', function(next) {
  if (this.appointmentDate && (!this.appointmentDay || isNaN(this.appointmentDay?.getTime?.()))) {
    const d = new Date(this.appointmentDate);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    this.appointmentDay = startOfDay;
  }
  next();
});

// Pre-save middleware to update updatedAt
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
