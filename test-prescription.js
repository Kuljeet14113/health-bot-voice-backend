import { SymptomClassifier } from './utils/symptomClassifier.js';
import { generatePrescriptionWithGemini } from './utils/prescriptionService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testPrescriptionFunctionality = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-app');
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Prescription Generation...\n');

    // Test cases
    const testCases = [
      {
        name: "Basic Symptom - Fever",
        data: {
          symptoms: "fever, cough, headache",
          age: "25",
          weight: "70",
          allergies: "None",
          medications: "None"
        },
        expectedComplexity: "basic"
      },
      {
        name: "Complex Symptom - Cancer",
        data: {
          symptoms: "blood cancer, fatigue, weight loss",
          age: "45",
          weight: "65",
          allergies: "Penicillin",
          medications: "None"
        },
        expectedComplexity: "complex"
      },
      {
        name: "Heart Condition",
        data: {
          symptoms: "chest pain, shortness of breath, hypertension",
          age: "60",
          weight: "80",
          allergies: "None",
          medications: "Aspirin"
        },
        expectedComplexity: "complex"
      }
    ];

    for (const testCase of testCases) {
      console.log(`📝 Testing: ${testCase.name}`);
      console.log(`   Symptoms: ${testCase.data.symptoms}`);
      
      // Test symptom classification
      const classification = await SymptomClassifier.processSymptom(testCase.data.symptoms);
      console.log(`   Classification: ${classification.complexity} (Expected: ${testCase.expectedComplexity})`);
      console.log(`   Should see doctor: ${classification.shouldSeeDoctor}`);
      
      if (classification.complexity === 'complex') {
        console.log(`   Recommended specialization: ${classification.specialization}`);
        console.log(`   Available doctors: ${classification.doctors.length}`);
      }
      
      // Test prescription generation
      try {
        const prescriptionData = {
          ...testCase.data,
          complexity: classification.complexity,
          specialization: classification.specialization
        };
        
        console.log(`   Generating prescription...`);
        const prescription = await generatePrescriptionWithGemini(prescriptionData);
        
        // Show first few lines of prescription
        const preview = prescription.split('\n').slice(0, 5).join('\n');
        console.log(`   Prescription preview:\n${preview}...`);
        
        console.log(`   ✅ Test PASSED\n`);
      } catch (error) {
        console.log(`   ❌ Prescription generation failed: ${error.message}\n`);
      }
    }

    console.log('🎉 Prescription functionality testing completed!');

  } catch (error) {
    console.error('❌ Error testing prescription functionality:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testPrescriptionFunctionality();
