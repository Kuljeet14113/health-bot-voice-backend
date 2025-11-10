import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

RECOMMENDATIONS (Self-care DOs):
• [What the patient SHOULD do 1]
• [What the patient SHOULD do 2]
• [What the patient SHOULD do 3]

AVOID (DON'Ts):
• [What the patient should AVOID 1]
• [What the patient should AVOID 2]

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
5. Provide practical, actionable recommendations including clear DOs and DON'Ts
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

RECOMMENDATIONS (Self-care DOs):
• Rest and maintain adequate hydration
• Monitor symptoms closely

AVOID (DON'Ts):
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

// -------------------------
// Medicines dataset helpers
// -------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadMedicinesDataset() {
  try {
    const p = path.join(__dirname, '../datasets/medicines.json');
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(json.conditions) ? json.conditions : [];
  } catch (e) {
    console.error('Failed to load medicines dataset:', e);
    return [];
  }
}

// Simple keyword mapping from symptoms text to dataset conditions
const CONDITION_KEYWORDS = [
  { condition: 'Common Cold', keywords: ['cold', 'runny nose', 'sneezing'] },
  { condition: 'Fever', keywords: ['fever', 'high temperature'] },
  { condition: 'Cough', keywords: ['cough', 'coughing'] },
  { condition: 'Sore Throat', keywords: ['sore throat', 'throat pain'] },
  { condition: 'Headache/Migraine', keywords: ['headache', 'migraine'] },
  { condition: 'Gastric Acidity', keywords: ['acidity', 'acid reflux', 'heartburn'] },
  { condition: 'Stomach Pain/Indigestion', keywords: ['stomach pain', 'indigestion', 'gastric pain'] },
  { condition: 'Diarrhea', keywords: ['diarrhea', 'loose stool'] },
  { condition: 'Constipation', keywords: ['constipation'] },
  { condition: 'Vomiting/Nausea', keywords: ['vomit', 'nausea', 'nauseous'] },
  { condition: 'Fatigue/Body Ache', keywords: ['fatigue', 'body ache', 'tired'] },
  { condition: 'Back Pain', keywords: ['back pain'] },
  { condition: 'Joint Pain/Arthritis', keywords: ['joint pain', 'arthritis', 'knee pain'] },
  { condition: 'Skin Rash/Allergy', keywords: ['rash', 'skin allergy', 'itch'] },
  { condition: 'Acne', keywords: ['acne', 'pimple'] },
  { condition: 'Allergic Rhinitis', keywords: ['sneeze', 'allergic rhinitis', 'nasal allergy'] },
  { condition: 'Eye Irritation/Allergy', keywords: ['eye itch', 'eye irritation', 'red eyes'] },
  { condition: 'Toothache', keywords: ['toothache', 'tooth pain'] },
  { condition: 'Ear Pain', keywords: ['ear pain', 'earache'] }
];

export function findMedicinesForSymptoms(symptomsText) {
  if (!symptomsText) return [];
  const q = symptomsText.toLowerCase();
  const dataset = loadMedicinesDataset();

  // First: keyword mapping to a condition
  const match = CONDITION_KEYWORDS.find(m => m.keywords.some(k => q.includes(k)));
  const matchedCondition = match?.condition;

  // Second: direct mention of condition name
  const direct = dataset.find(c => q.includes(c.condition.toLowerCase()));
  const conditionToUse = direct?.condition || matchedCondition;

  if (!conditionToUse) return [];

  const entry = dataset.find(c => c.condition === conditionToUse);
  if (!entry || !Array.isArray(entry.medicines)) return [];

  return entry.medicines.map(m => ({
    name: m.name,
    dose: m.dose,
    frequency: m.frequency,
    timing: m.timing,
    condition: conditionToUse
  }));
}
