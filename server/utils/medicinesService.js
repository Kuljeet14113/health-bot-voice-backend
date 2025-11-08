import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadMedicines() {
  try {
    const p = path.join(__dirname, '../datasets/medicines.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return data?.conditions || [];
  } catch (e) {
    console.error('Failed to load medicines dataset:', e);
    return [];
  }
}

function normalize(str = '') {
  return String(str).toLowerCase();
}

// Basic heuristic mapping: if user's symptom text includes keywords
// related to a condition name, consider it a match.
export function findMedicinesBySymptomText(symptomText) {
  const text = normalize(symptomText);
  const conditions = loadMedicines();

  // Preferred direct keyword list to improve recall
  const keywordMap = [
    { keywords: ['fever', 'temperature'], condition: 'Fever' },
    { keywords: ['cold', 'runny nose', 'sneeze'], condition: 'Common Cold' },
    { keywords: ['headache', 'migraine', 'head pain'], condition: 'Headache/Migraine' },
    { keywords: ['cough', 'phlegm'], condition: 'Cough' },
    { keywords: ['sore throat', 'throat pain'], condition: 'Sore Throat' },
    { keywords: ['stomach', 'indigestion', 'acidity', 'gastric'], condition: 'Stomach Pain/Indigestion' },
    { keywords: ['diarrhea', 'loose motion'], condition: 'Diarrhea' },
    { keywords: ['constipation'], condition: 'Constipation' },
    { keywords: ['vomit', 'nausea'], condition: 'Vomiting/Nausea' },
    { keywords: ['dizzy', 'vertigo', 'lightheaded'], condition: 'Dizziness/Vertigo' },
    { keywords: ['fatigue', 'body ache', 'weakness'], condition: 'Fatigue/Body Ache' },
    { keywords: ['back pain'], condition: 'Back Pain' },
    { keywords: ['joint pain', 'arthritis', 'knee'], condition: 'Joint Pain/Arthritis' },
    { keywords: ['muscle pain', 'myalgia'], condition: 'Muscle Pain' },
    { keywords: ['eye', 'itchy eyes', 'red eyes'], condition: 'Eye Irritation/Allergy' },
    { keywords: ['ear pain', 'earache'], condition: 'Ear Pain' },
    { keywords: ['tooth', 'toothache'], condition: 'Toothache' },
    { keywords: ['gum bleed'], condition: 'Gum Bleeding' },
    { keywords: ['rash', 'allergy', 'itching'], condition: 'Skin Rash/Allergy' },
    { keywords: ['acne', 'pimple'], condition: 'Acne' },
    { keywords: ['sneeze', 'allergic rhinitis', 'itchy nose'], condition: 'Allergic Rhinitis' },
    { keywords: ['asthma', 'wheeze'], condition: 'Asthma (mild)' },
    { keywords: ['burning urination', 'urinary pain', 'uti'], condition: 'UTI Symptoms (burning urination)' },
    { keywords: ['frequent urination'], condition: 'Frequent Urination (non-urgent)' },
    { keywords: ['period pain', 'dysmenorrhea', 'cramps'], condition: 'Period Pain (Dysmenorrhea)' },
    { keywords: ['irregular period'], condition: 'Irregular Periods (symptomatic)' },
    { keywords: ['pregnancy', 'morning sickness', 'nausea'], condition: 'Pregnancy Nausea' },
    { keywords: ['insomnia', 'sleep'], condition: 'Insomnia (short-term)' },
    { keywords: ['anxiety'], condition: 'Anxiety (mild)' },
    { keywords: ['depression'], condition: 'Depression (supportive)' },
    { keywords: ['low blood pressure', 'hypotension', 'lightheaded'], condition: 'Hypotension (supportive)' },
    { keywords: ['anemia', 'low hemoglobin'], condition: 'Anemia (iron deficiency)' },
    { keywords: ['flu', 'influenza'], condition: 'Flu/Influenza' },
    { keywords: ['food poisoning'], condition: 'Food Poisoning (mild)' },
    { keywords: ['sunburn'], condition: 'Sunburn' },
    { keywords: ['heat exhaustion', 'heat stroke'], condition: 'Heat Exhaustion (supportive)' },
    { keywords: ['dehydration'], condition: 'Dehydration (mild)' },
    { keywords: ['allergic reaction', 'hives', 'swelling'], condition: 'Allergic Reaction (mild)' },
  ];

  const targeted = keywordMap.find(entry => entry.keywords.some(k => text.includes(k)));

  const matched = [];
  if (targeted) {
    const condition = conditions.find(c => normalize(c.condition) === normalize(targeted.condition));
    if (condition) matched.push(condition);
  }

  // Fallback: scan conditions if no targeted match found
  if (matched.length === 0) {
    for (const c of conditions) {
      const cond = normalize(c.condition);
      // Any overlapping words
      if (cond.split(/[\s/()]+/).some(w => w && text.includes(w))) {
        matched.push(c);
      }
      if (matched.length >= 2) break;
    }
  }

  // Map to simplified response
  return matched.map(m => ({
    condition: m.condition,
    medicines: (m.medicines || []).map(x => ({
      name: x.name,
      dose: x.dose,
      frequency: x.frequency,
      timing: x.timing,
    }))
  }));
}
