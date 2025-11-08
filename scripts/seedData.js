import mongoose from 'mongoose';
import Doctor from '../models/doctor.js';
import Symptom from '../models/symptom.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleDoctors = [
  {
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@hospital.com",
    password: "$2b$10$example", // This would be hashed in real implementation
    specialization: "Oncologist",
    experience: "15 years",
    hospital: "City General Hospital",
    phone: "+1-555-0101",
    location: "New York, NY",
    isEmailVerified: true
  },
  {
    name: "Dr. Michael Chen",
    email: "michael.chen@hospital.com",
    password: "$2b$10$example",
    specialization: "Cardiologist",
    experience: "12 years",
    hospital: "Heart Care Center",
    phone: "+1-555-0102",
    location: "Los Angeles, CA",
    isEmailVerified: true
  },
  {
    name: "Dr. Emily Rodriguez",
    email: "emily.rodriguez@hospital.com",
    password: "$2b$10$example",
    specialization: "Neurologist",
    experience: "10 years",
    hospital: "Neuro Medical Center",
    phone: "+1-555-0103",
    location: "Chicago, IL",
    isEmailVerified: true
  },
  {
    name: "Dr. James Wilson",
    email: "james.wilson@hospital.com",
    password: "$2b$10$example",
    specialization: "General Practitioner",
    experience: "20 years",
    hospital: "Family Health Clinic",
    phone: "+1-555-0104",
    location: "Houston, TX",
    isEmailVerified: true
  },
  {
    name: "Dr. Lisa Thompson",
    email: "lisa.thompson@hospital.com",
    password: "$2b$10$example",
    specialization: "Dermatologist",
    experience: "8 years",
    hospital: "Skin Care Center",
    phone: "+1-555-0105",
    location: "Miami, FL",
    isEmailVerified: true
  },
  {
    name: "Dr. Robert Kim",
    email: "robert.kim@hospital.com",
    password: "$2b$10$example",
    specialization: "Endocrinologist",
    experience: "14 years",
    hospital: "Diabetes Center",
    phone: "+1-555-0106",
    location: "Seattle, WA",
    isEmailVerified: true
  },
  {
    name: "Dr. Maria Garcia",
    email: "maria.garcia@hospital.com",
    password: "$2b$10$example",
    specialization: "General Physician",
    experience: "18 years",
    hospital: "Community Health Center",
    phone: "+1-555-0107",
    location: "Phoenix, AZ",
    isEmailVerified: true
  },
  {
    name: "Dr. David Lee",
    email: "david.lee@hospital.com",
    password: "$2b$10$example",
    specialization: "Family Medicine",
    experience: "16 years",
    hospital: "Primary Care Clinic",
    phone: "+1-555-0108",
    location: "Denver, CO",
    isEmailVerified: true
  },
  {
    name: "Dr. Jennifer Brown",
    email: "jennifer.brown@hospital.com",
    password: "$2b$10$example",
    specialization: "Pulmonologist",
    experience: "11 years",
    hospital: "Respiratory Care Center",
    phone: "+1-555-0109",
    location: "Boston, MA",
    isEmailVerified: true
  },
  {
    name: "Dr. Ahmed Hassan",
    email: "ahmed.hassan@hospital.com",
    password: "$2b$10$example",
    specialization: "Gastroenterologist",
    experience: "13 years",
    hospital: "Digestive Health Center",
    phone: "+1-555-0110",
    location: "Atlanta, GA",
    isEmailVerified: true
  }
];

const sampleSymptoms = [
  {
    symptom: "fever",
    treatment: "Rest, stay hydrated, take paracetamol if needed. If fever persists for more than 2 days, consult a doctor.",
    complexity: "basic",
    category: "general",
    relatedSymptoms: ["high temperature", "chills", "sweating"]
  },
  {
    symptom: "headache",
    treatment: "Rest in a quiet place, drink water, avoid screen time. If severe or frequent, consult a doctor.",
    complexity: "basic",
    category: "neurological",
    relatedSymptoms: ["migraine", "head pain", "tension"]
  },
  {
    symptom: "cancer",
    treatment: "This requires immediate medical attention and specialized treatment.",
    complexity: "complex",
    category: "oncology",
    relatedSymptoms: ["tumor", "unexplained weight loss", "fatigue"],
    doctorSpecialization: "Oncologist"
  },
  {
    symptom: "heart attack",
    treatment: "This is a medical emergency. Call emergency services immediately.",
    complexity: "complex",
    category: "cardiology",
    relatedSymptoms: ["chest pain", "shortness of breath", "nausea"],
    doctorSpecialization: "Cardiologist"
  },
  {
    symptom: "stroke",
    treatment: "This is a medical emergency. Call emergency services immediately.",
    complexity: "complex",
    category: "neurology",
    relatedSymptoms: ["facial drooping", "arm weakness", "speech difficulty"],
    doctorSpecialization: "Neurologist"
  },
  {
    symptom: "diabetes",
    treatment: "This requires ongoing medical management and monitoring.",
    complexity: "complex",
    category: "endocrinology",
    relatedSymptoms: ["excessive thirst", "frequent urination", "fatigue"],
    doctorSpecialization: "Endocrinologist"
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-app');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Doctor.deleteMany({});
    await Symptom.deleteMany({});
    console.log('Cleared existing data');

    // Insert sample doctors
    const doctors = await Doctor.insertMany(sampleDoctors);
    console.log(`Inserted ${doctors.length} doctors`);

    // Insert sample symptoms
    const symptoms = await Symptom.insertMany(sampleSymptoms);
    console.log(`Inserted ${symptoms.length} symptoms`);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
seedDatabase();
