import { SymptomClassifier } from '../utils/symptomClassifier.js';
import { generateProfessionalAdvice } from '../utils/geminiService.js';
import { findMedicinesBySymptomText } from '../utils/medicinesService.js';

export const processChatMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // First, try to get professional advice from Gemini (with dataset fallback inside)
    let professionalAdvice = null;
    try {
      const geminiResponse = await generateProfessionalAdvice(message);
      if (geminiResponse && geminiResponse.success) {
        professionalAdvice = geminiResponse.message;
      }
    } catch (error) {
      console.log('Gemini service unavailable, using fallback');
    }

    // Classify the symptom to determine complexity
    const classification = await SymptomClassifier.processSymptom(message);

    // Find medicine suggestions from local dataset
    const medicines = findMedicinesBySymptomText(message);
    
    let response = {
      success: true,
      message: '',
      complexity: classification.complexity,
      shouldSeeDoctor: classification.shouldSeeDoctor,
      doctors: classification.doctors || [],
      specialization: classification.specialization || null,
      timestamp: new Date().toISOString(),
      medicines: medicines || []
    };

    // Combine professional advice with classification results
    if (professionalAdvice) {
      response.message = professionalAdvice;

      // Add doctor recommendation if complex
      if (classification.complexity === 'complex' && classification.doctors.length > 0) {
        response.message += `\n\n**Doctor Recommendation:** Based on your symptoms, I recommend consulting with a ${classification.specialization}. Here are some available doctors:`;
        response.doctors = classification.doctors;
      }
      // Add concise medicine suggestions summary below the advice
      if (medicines && medicines.length > 0) {
        const first = medicines[0];
        const medsList = (first.medicines || []).slice(0, 3).map(m => `${m.name} (${m.dose}, ${m.frequency}${m.timing ? ', ' + m.timing : ''})`).join('; ');
        if (medsList) {
          response.message += `\n\n**Suggested Medicines (from dataset) for ${first.condition}:** ${medsList}`;
        }
      }
    } else {
      // Fallback response if Gemini is unavailable
      response.message = classification.message;
      if (medicines && medicines.length > 0) {
        const first = medicines[0];
        const medsList = (first.medicines || []).slice(0, 3).map(m => `${m.name} (${m.dose}, ${m.frequency}${m.timing ? ', ' + m.timing : ''})`).join('; ');
        if (medsList) {
          response.message += `\n\n**Suggested Medicines (from dataset) for ${first.condition}:** ${medsList}`;
        }
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({
      success: false,
      message: 'I apologize, but I\'m having trouble processing your request right now. Please try again or consult a healthcare provider directly.',
      error: error.message
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, you'd store chat history in database
    res.json({
      success: true,
      messages: [],
      message: 'Chat history feature coming soon'
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history'
    });
  }
};
