import { SymptomClassifier } from './utils/symptomClassifier.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testChatFunctionality = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-app');
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Symptom Classification...\n');

    // Test cases
    const testCases = [
      {
        input: "I have fever",
        expected: "basic"
      },
      {
        input: "I have blood cancer",
        expected: "complex"
      },
      {
        input: "I have a headache",
        expected: "basic"
      },
      {
        input: "I think I'm having a heart attack",
        expected: "complex"
      },
      {
        input: "I have diabetes symptoms",
        expected: "complex"
      }
    ];

    for (const testCase of testCases) {
      console.log(`📝 Testing: "${testCase.input}"`);
      
      const result = await SymptomClassifier.processSymptom(testCase.input);
      
      console.log(`   Complexity: ${result.complexity}`);
      console.log(`   Should see doctor: ${result.shouldSeeDoctor}`);
      
      if (result.complexity === 'complex' && result.doctors.length > 0) {
        console.log(`   Recommended specialization: ${result.specialization}`);
        console.log(`   Available doctors: ${result.doctors.length}`);
        result.doctors.forEach((doctor, index) => {
          console.log(`     ${index + 1}. ${doctor.name} - ${doctor.specialization}`);
        });
      }
      
      console.log(`   Response: ${result.message.substring(0, 100)}...`);
      console.log(`   ✅ Test ${result.complexity === testCase.expected ? 'PASSED' : 'FAILED'}\n`);
    }

    console.log('🎉 Chat functionality testing completed!');

  } catch (error) {
    console.error('❌ Error testing chat functionality:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testChatFunctionality();
