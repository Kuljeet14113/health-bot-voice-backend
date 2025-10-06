import fetch from 'node-fetch';

export const generateProfessionalAdvice = async (symptomQuery) => {
  try {
    if (!symptomQuery || !symptomQuery.trim()) {
      return {
        success: false,
        message: 'Symptom query is required'
      };
    }

    // Simple server-side guard for clearly non-medical prompts
    const nonMedicalTriggers = [
      'capital of', 'who is', 'what is node', 'what is javascript', 'programming', 'python', 'java ', 'c++', 'react', 'football', 'cricket', 'movie', 'song', 'weather', 'stock', 'bitcoin', 'crypto', 'country', 'president', 'prime minister', 'capital city'
    ];
    const lowerQ = symptomQuery.toLowerCase();
    if (nonMedicalTriggers.some(k => lowerQ.includes(k))) {
      return {
        success: true,
        message: 'This question is outside my medical scope. Please ask about health symptoms, conditions, or care.'
      };
    }

    const prompt = `You are responding as a licensed clinician. A patient reports: "${symptomQuery}".

STRICT RESPONSE REQUIREMENTS:
- Provide only clinically relevant information. Do not include any non-medical content, metadata, sources, or system notes.
- Do not diagnose or claim certainty. Use non-diagnostic language ("may be consistent with", "could be due to").
- Be concise, empathetic, and actionable.
- Structure the response with these headings only: Assessment, Self‑care, Red flags, Next steps.
- Keep within 1600 characters total.

OUT-OF-SCOPE HANDLING:
If the patient's message is not about health, symptoms, conditions, risks, or medical self-care, respond EXACTLY with: "This question is outside my medical scope. Please ask about health symptoms, conditions, or care." and nothing else.

Now write the response.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        message: 'AI service is currently unavailable. Please consult a healthcare provider.'
      };
    }

    // Gemini Generative Language API (text) — use a supported model for v1beta
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
          maxOutputTokens: 512
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', err);
      return {
        success: false,
        message: 'AI service is temporarily unavailable. Please try again later.'
      };
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return {
      success: true,
      message: text
    };
  } catch (error) {
    console.error('Gemini service error:', error);
    return {
      success: false,
      message: 'AI service is temporarily unavailable. Please try again later.'
    };
  }
};
