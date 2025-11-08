import { SymptomClassifier } from '../utils/symptomClassifier.js';
import { generatePrescriptionWithGemini } from '../utils/prescriptionService.js';
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
    
    // Find appropriate doctor based on classification
    let recommendedDoctor = null;
    if (classification.complexity === 'complex' && classification.doctors.length > 0) {
      recommendedDoctor = classification.doctors[0]; // Get first recommended doctor
    } else {
      // For basic symptoms, recommend a general practitioner
      const generalPractitioners = await Doctor.find({ 
        specialization: { $regex: /general|family|primary/i }
      }).limit(1);
      
      if (generalPractitioners.length > 0) {
        recommendedDoctor = generalPractitioners[0];
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
      specialization: classification.specialization
    };

    const prescription = await generatePrescriptionWithGemini(prescriptionData);

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
