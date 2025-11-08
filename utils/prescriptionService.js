import fetch from 'node-fetch';

export const generatePrescriptionWithGemini = async (prescriptionData) => {
  try {
    const { symptoms, age, weight, allergies, medications, complexity, specialization } = prescriptionData;

    const currentDate = new Date().toLocaleDateString();

    const prompt = `You are a licensed medical professional generating a structured prescription. 

PATIENT INFORMATION:
- Symptoms: ${symptoms}
- Age: ${age}
- Weight: ${weight}
- Known Allergies: ${allergies}
- Current Medications: ${medications}
- Condition Complexity: ${complexity}
- Recommended Specialization: ${specialization || 'General Practice'}

REQUIRED OUTPUT FORMAT:
Generate a medical prescription in EXACTLY this format:

PRESCRIPTION RECOMMENDATION
Generated: ${currentDate}

DIAGNOSIS: [Provide a professional medical assessment based on the symptoms]

MEDICATIONS:
• [Drug Name]: [Dosage & Duration]
  Instructions: [Specific instructions for taking the medication]

RECOMMENDATIONS:
• [Lifestyle recommendation 1]
• [Lifestyle recommendation 2]
• [Additional care instructions]

WARNINGS:
• [Important warning or red flag 1]
• [Important warning or red flag 2]

FOLLOW-UP:
• [When to revisit or consult doctor]

DISCLAIMER:
This is an AI-generated recommendation for informational purposes only.

IMPORTANT GUIDELINES:
1. Be clinically accurate and evidence-based
2. Consider patient's age, weight, allergies, and current medications
3. For complex conditions, emphasize the need for specialist consultation
4. Include appropriate warnings and red flags
5. Provide practical, actionable recommendations
6. Use professional medical terminology
7. Keep medications appropriate for the condition described
8. Always include the disclaimer

Generate the prescription now:`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const response = await fetch(`${geminiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const result = await response.json();
    const prescriptionText = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No prescription generated.';

    return prescriptionText;
  } catch (error) {
    console.error('Error generating prescription with Gemini:', error);
    
    // Fallback prescription template
    const currentDate = new Date().toLocaleDateString();
    return `PRESCRIPTION RECOMMENDATION
Generated: ${currentDate}

DIAGNOSIS: Based on the symptoms described (${prescriptionData.symptoms}), this appears to be a condition requiring medical evaluation.

MEDICATIONS:
• Symptom Management: As directed by healthcare provider
  Instructions: Follow dosage instructions carefully

RECOMMENDATIONS:
• Rest and maintain adequate hydration
• Monitor symptoms closely
• Avoid self-medication without professional guidance

WARNINGS:
• Seek immediate medical attention if symptoms worsen
• Consult healthcare provider for proper diagnosis and treatment

FOLLOW-UP:
• Schedule appointment with healthcare provider within 24-48 hours

DISCLAIMER:
This is an AI-generated recommendation for informational purposes only.`;
  }
};
