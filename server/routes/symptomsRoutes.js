import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { searchWithSpellCheck, findSpellSuggestions } from '../utils/spellChecker.js';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Route to get all symptoms
router.get('/symptoms', (req, res) => {
  try {
    const symptomsPath = path.join(__dirname, '../datasets/symptoms.json');
    const symptomsData = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
    res.json(symptomsData);
  } catch (error) {
    console.error('Error reading symptoms data:', error);
    res.status(500).json({ error: 'Failed to load symptoms data' });
  }
});

// Route to search symptoms by keyword with spell checking
router.get('/symptoms/search', (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Use the spell checker to find matches and suggestions
    const searchResult = searchWithSpellCheck(query);
    
    res.json({
      matches: searchResult.matches,
      spellSuggestions: searchResult.spellSuggestions,
      hasSpellingSuggestions: searchResult.hasSpellingSuggestions,
      originalQuery: searchResult.originalQuery
    });
  } catch (error) {
    console.error('Error searching symptoms:', error);
    res.status(500).json({ error: 'Failed to search symptoms' });
  }
});

// Route to get spell suggestions for a symptom query
router.get('/symptoms/suggestions', (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const suggestions = findSpellSuggestions(query, 60, 5);
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting spell suggestions:', error);
    res.status(500).json({ error: 'Failed to get spell suggestions' });
  }
});

// Route to get symptom advice by specific symptom
router.get('/symptoms/advice/:symptom', (req, res) => {
  try {
    const { symptom } = req.params;
    const symptomsPath = path.join(__dirname, '../datasets/symptoms.json');
    const symptomsData = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
    
    const searchQuery = symptom.toLowerCase();
    const matchingSymptom = symptomsData.find(item => 
      item.symptoms.some(s => s.toLowerCase().includes(searchQuery))
    );

    if (matchingSymptom) {
      res.json(matchingSymptom);
    } else {
      res.status(404).json({ error: 'Symptom not found' });
    }
  } catch (error) {
    console.error('Error finding symptom advice:', error);
    res.status(500).json({ error: 'Failed to find symptom advice' });
  }
});

export default router;

// New: Generate professional advice using Gemini based on symptoms dataset
router.post('/symptoms/gemini/advice', async (req, res) => {
  try {
    const { symptomQuery } = req.body;
    if (!symptomQuery) {
      return res.status(400).json({ success: false, message: 'symptomQuery is required' });
    }

    // Simple server-side guard for clearly non-medical prompts
    const nonMedicalTriggers = [
      'capital of', 'who is', 'what is node', 'what is javascript', 'programming', 'python', 'java ', 'c++', 'react', 'football', 'cricket', 'movie', 'song', 'weather', 'stock', 'bitcoin', 'crypto', 'country', 'president', 'prime minister', 'capital city'
    ];
    const lowerQ = symptomQuery.toLowerCase();
    if (nonMedicalTriggers.some(k => lowerQ.includes(k))) {
      return res.json({
        success: true,
        message: 'This question is outside my medical scope. Please ask about health symptoms, conditions, or care.'
      });
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
      return res.status(500).json({ success: false, message: 'Gemini API key not configured' });
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
      return res.status(502).json({ success: false, message: 'Gemini API error', error: err });
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    res.json({ success: true, message: text });
  } catch (error) {
    console.error('Gemini advice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate advice' });
  }
});
