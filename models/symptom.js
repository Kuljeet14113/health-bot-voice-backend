import mongoose from 'mongoose';

const symptomSchema = new mongoose.Schema({
  symptom: {
    type: String,
    required: true,
    unique: true
  },
  treatment: {
    type: String,
    required: true
  },
  complexity: {
    type: String,
    enum: ['basic', 'complex'],
    default: 'basic'
  },
  category: {
    type: String,
    required: true
  },
  relatedSymptoms: [String],
  doctorSpecialization: {
    type: String,
    required: function() {
      return this.complexity === 'complex';
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Symptom', symptomSchema);
