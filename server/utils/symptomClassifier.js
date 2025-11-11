import Symptom from '../models/symptom.js';
import Doctor from '../models/doctor.js';

// Complex symptoms that require doctor consultation
const COMPLEX_SYMPTOMS = [
  'cancer', 'tumor', 'stroke', 'heart attack', 'diabetes', 'hypertension',
  'pneumonia', 'tuberculosis', 'hepatitis', 'kidney failure', 'liver disease',
  'asthma', 'epilepsy', 'depression', 'anxiety disorder', 'bipolar',
  'arthritis', 'osteoporosis', 'fibromyalgia', 'lupus', 'multiple sclerosis',
  'alzheimer', 'dementia', 'parkinson', 'migraine', 'seizure',
  'blood clot', 'aneurysm', 'appendicitis', 'gallstones', 'kidney stones',
  'ulcer', 'crohn', 'colitis', 'thyroid', 'adrenal', 'pituitary',
  'autoimmune', 'chronic fatigue', 'fibrosis', 'cirrhosis', 'jaundice',
  'anemia', 'leukemia', 'lymphoma', 'sarcoma', 'melanoma',
  'pregnancy complications', 'miscarriage', 'ectopic pregnancy',
  'mental health crisis', 'suicidal thoughts', 'panic attack',
  'severe pain', 'unexplained weight loss', 'unexplained weight gain',
  'chronic cough', 'blood in urine', 'blood in stool', 'chest pain',
  'severe headache', 'vision loss', 'hearing loss', 'paralysis',
  'numbness', 'tingling', 'memory loss', 'confusion', 'delirium'
];

// Basic symptoms that can be handled with self-care
const BASIC_SYMPTOMS = [
  'fever', 'headache', 'cold', 'cough', 'sore throat', 'stomach pain',
  'diarrhea', 'constipation', 'vomiting', 'nausea', 'dizziness',
  'fatigue', 'tiredness', 'weakness', 'insomnia', 'stress',
  'minor cuts', 'bruises', 'sunburn', 'allergies', 'runny nose',
  'sneezing', 'itchy eyes', 'dry skin', 'acne', 'dandruff',
  'muscle ache', 'back pain', 'neck pain', 'joint pain',
  'indigestion', 'heartburn', 'gas', 'bloating', 'hiccups',
  'dehydration', 'hunger', 'thirst', 'sleepiness', 'restlessness'
];

// Doctor specialization mapping for complex symptoms
const SPECIALIZATION_MAP = {
  'cancer': 'Oncologist',
  'tumor': 'Oncologist',
  'heart': 'Cardiologist',
  'stroke': 'Neurologist',
  'diabetes': 'Endocrinologist',
  'hypertension': 'Cardiologist',
  'lung': 'Pulmonologist',
  'pneumonia': 'Pulmonologist',
  'tuberculosis': 'Pulmonologist',
  'liver': 'Hepatologist',
  'kidney': 'Nephrologist',
  'asthma': 'Pulmonologist',
  'epilepsy': 'Neurologist',
  'depression': 'Psychiatrist',
  'anxiety': 'Psychiatrist',
  'mental health': 'Psychiatrist',
  'arthritis': 'Rheumatologist',
  'bone': 'Orthopedist',
  'joint': 'Orthopedist',
  'skin': 'Dermatologist',
  'eye': 'Ophthalmologist',
  'ear': 'ENT Specialist',
  'throat': 'ENT Specialist',
  'nose': 'ENT Specialist',
  'stomach': 'Gastroenterologist',
  'digestive': 'Gastroenterologist',
  'thyroid': 'Endocrinologist',
  'hormone': 'Endocrinologist',
  'blood': 'Hematologist',
  'immune': 'Immunologist',
  'pregnancy': 'Gynecologist',
  'women': 'Gynecologist',
  'men': 'Urologist',
  'child': 'Pediatrician',
  'baby': 'Pediatrician'
};

export class SymptomClassifier {
  static classifySymptom(symptomText) {
    const text = symptomText.toLowerCase();
    
    // Check for complex symptoms
    const isComplex = COMPLEX_SYMPTOMS.some(complexSymptom => 
      text.includes(complexSymptom.toLowerCase())
    );
    
    // Check for basic symptoms
    const isBasic = BASIC_SYMPTOMS.some(basicSymptom => 
      text.includes(basicSymptom.toLowerCase())
    );
    
    // Determine complexity
    let complexity = 'basic';
    if (isComplex) {
      complexity = 'complex';
    } else if (!isBasic && !isComplex) {
      // If neither basic nor complex keywords found, default to basic
      complexity = 'basic';
    }
    
    return {
      complexity,
      isComplex,
      isBasic
    };
  }
  
  static getDoctorSpecialization(symptomText) {
    const text = symptomText.toLowerCase();
    
    // Find matching specialization
    for (const [keyword, specialization] of Object.entries(SPECIALIZATION_MAP)) {
      if (text.includes(keyword)) {
        return specialization;
      }
    }
    
    // Default to General Practitioner for complex symptoms without specific match
    return 'General Practitioner';
  }
  
  static async processSymptom(symptomText) {
    try {
      const classification = this.classifySymptom(symptomText);
      
      if (classification.complexity === 'complex') {
        const specialization = this.getDoctorSpecialization(symptomText);
        
        // Find doctors with matching specialization
        const doctors = await Doctor.find({ 
          specialization: { $regex: specialization, $options: 'i' }
        }).limit(3);
        
        return {
          complexity: 'complex',
          message: `Based on your symptoms, I recommend consulting with a ${specialization}. This appears to be a complex medical condition that requires professional evaluation.`,
          doctors: doctors.length > 0 ? doctors : [],
          specialization,
          shouldSeeDoctor: true
        };
      } else {
        // For basic symptoms, provide AI recommendations disclaimer per request
        return {
          complexity: 'basic',
          message: `here are the recommendations according to heathbot ai, but please consult your doc before taking medicines`,
          doctors: [],
          shouldSeeDoctor: false
        };
      }
    } catch (error) {
      console.error('Error processing symptom:', error);
      return {
        complexity: 'basic',
        message: 'I understand you have health concerns. For the best care, I recommend consulting with a healthcare provider.',
        doctors: [],
        shouldSeeDoctor: true,
        error: true
      };
    }
  }
}
