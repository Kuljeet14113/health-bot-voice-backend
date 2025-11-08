import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { searchWithSpellCheck, findSpellSuggestions } from '../utils/spellChecker.js';
import fetch from 'node-fetch';
import { generateProfessionalAdvice as generateAdviceService } from '../utils/geminiService.js';
import { SymptomClassifier } from '../utils/symptomClassifier.js';
import { findMedicinesBySymptomText } from '../utils/medicinesService.js';

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

    // Delegate to shared service which already includes out-of-scope guard,
    // dataset context, and dataset-based fallback when API key is missing
    const result = await generateAdviceService(symptomQuery);

    if (!result) {
      return res.status(502).json({ success: false, message: 'Failed to generate advice' });
    }

    // Enrich with classification and medicines so clients can render full UI
    const classification = await SymptomClassifier.processSymptom(symptomQuery);
    const medicines = findMedicinesBySymptomText(symptomQuery);

    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.message,
      complexity: classification.complexity,
      shouldSeeDoctor: classification.shouldSeeDoctor,
      doctors: classification.doctors || [],
      specialization: classification.specialization || SymptomClassifier.getDoctorSpecialization(symptomQuery),
      medicines: medicines || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gemini advice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate advice' });
  }
});
