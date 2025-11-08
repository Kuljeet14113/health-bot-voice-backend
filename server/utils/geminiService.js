import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatasetAdvice(symptomQuery) {
  try {
    const symptomsPath = path.join(__dirname, '../datasets/symptoms.json');
    const data = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
    const q = symptomQuery.toLowerCase();
    const matches = data.filter(item =>
      Array.isArray(item.symptoms) && item.symptoms.some(s => s.toLowerCase().includes(q))
    );

    if (matches.length === 0) return null;

    // Merge unique advices (cap to 3) to avoid repetition
    const advices = [];
    for (const m of matches) {
      if (m.advice && !advices.includes(m.advice)) advices.push(m.advice);
      if (advices.length >= 3) break;
    }

    return advices.join('\n\n');
  } catch (e) {
    console.error('Failed to read dataset for advice:', e);
    return null;
  }
}

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

    const datasetAdvice = getDatasetAdvice(symptomQuery);

    const prompt = `You are responding as a licensed clinician. A patient reports: "${symptomQuery}".

STRICT RESPONSE REQUIREMENTS:
- Provide only clinically relevant information. Do not include any non-medical content, metadata, sources, or system notes.
- Do not diagnose or claim certainty. Use non-diagnostic language ("may be consistent with", "could be due to").
- Be concise, empathetic, and actionable.
- Structure the response with these headings only: Assessment, Self‑care, Red flags, Next steps.
- Keep within 1600 characters total.

KNOWLEDGE BASE (use as guidance if relevant; do not quote verbatim):
${datasetAdvice ? `"""
${datasetAdvice}
"""` : '(No dataset guidance found)'}

OUT-OF-SCOPE HANDLING:
If the patient's message is not about health, symptoms, conditions, risks, or medical self-care, respond EXACTLY with: "This question is outside my medical scope. Please ask about health symptoms, conditions, or care." and nothing else.

Now write the response.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback to dataset-only advice if available
      if (datasetAdvice) {
        return { success: true, message: datasetAdvice };
      }
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
      // Fallback to dataset advice if present
      if (datasetAdvice) {
        return { success: true, message: datasetAdvice };
      }
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
    // Last-resort dataset fallback
    const datasetAdvice = getDatasetAdvice(symptomQuery || '');
    if (datasetAdvice) {
      return { success: true, message: datasetAdvice };
    }
    return {
      success: false,
      message: 'AI service is temporarily unavailable. Please try again later.'
    };
  }
};
