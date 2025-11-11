import { SymptomClassifier } from '../utils/symptomClassifier.js';
import { generatePrescriptionWithGemini, findMedicinesForSymptoms } from '../utils/prescriptionService.js';
import Doctor from '../models/doctor.js';

export const generatePrescription = async (req, res) => {
  try {
    const { symptoms, age, weight, allergies, medications } = req.body;
    
    if (!symptoms || !symptoms.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Symptoms are required'
      });
    }

    // Classify symptoms to determine complexity and get doctor recommendation
    const classification = await SymptomClassifier.processSymptom(symptoms);
    // Derive a specialization even for basic cases
    const derivedSpecialization = classification.specialization || SymptomClassifier.getDoctorSpecialization(symptoms);
    
    // Find appropriate doctor based on classification
    let recommendedDoctor = null;
    if (classification.complexity === 'complex' && classification.doctors.length > 0) {
      recommendedDoctor = classification.doctors[0]; // Get first recommended doctor
    }

    // For basic cases, try to find a matching specialist by derived specialization; if none, keep null
    if (!recommendedDoctor && derivedSpecialization) {
      const specialist = await Doctor.findOne({
        specialization: { $regex: derivedSpecialization, $options: 'i' }
      });
      if (specialist) {
        recommendedDoctor = specialist;
      }
    }

    // Generate prescription using Gemini AI
    const prescriptionData = {
      symptoms: symptoms.trim(),
      age: age || 'Not specified',
      weight: weight || 'Not specified',
      allergies: allergies || 'None reported',
      medications: medications || 'None reported',
      complexity: classification.complexity,
      specialization: derivedSpecialization
    };

    const prescription = await generatePrescriptionWithGemini(prescriptionData);

    // Suggest medicines from dataset based on symptoms
    const suggestedMedicines = findMedicinesForSymptoms(symptoms);

    // Format response
    const response = {
      success: true,
      prescription: prescription,
      doctor: recommendedDoctor ? {
        name: recommendedDoctor.name,
        email: recommendedDoctor.email,
        phone: recommendedDoctor.phone,
        specialization: recommendedDoctor.specialization,
        hospital: recommendedDoctor.hospital,
        location: recommendedDoctor.location
      } : null,
      medicines: suggestedMedicines,
      complexity: classification.complexity,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prescription. Please try again.',
      error: error.message
    });
  }
};
