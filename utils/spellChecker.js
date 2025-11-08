// Spell checker utility for symptoms
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  // If one string is empty, return the length of the other
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Create matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
}

/**
 * Load symptoms data from JSON file
 * @returns {Array} - Array of symptom objects
 */
function loadSymptomsData() {
  try {
    const symptomsPath = path.join(__dirname, '../datasets/symptoms.json');
    const symptomsData = JSON.parse(fs.readFileSync(symptomsPath, 'utf8'));
    return symptomsData;
  } catch (error) {
    console.error('Error loading symptoms data:', error);
    return [];
  }
}

/**
 * Get all unique symptoms from the dataset
 * @returns {Array} - Array of all symptom strings
 */
function getAllSymptoms() {
  const symptomsData = loadSymptomsData();
  const allSymptoms = [];
  
  symptomsData.forEach(item => {
    item.symptoms.forEach(symptom => {
      if (!allSymptoms.includes(symptom.toLowerCase())) {
        allSymptoms.push(symptom.toLowerCase());
      }
    });
  });
  
  return allSymptoms;
}

/**
 * Find spell check suggestions for a given query
 * @param {string} query - User input query
 * @param {number} threshold - Minimum similarity threshold (default: 60)
 * @param {number} maxSuggestions - Maximum number of suggestions (default: 5)
 * @returns {Object} - Object containing exact matches, suggestions, and original query
 */
export function findSpellSuggestions(query, threshold = 60, maxSuggestions = 5) {
  const allSymptoms = getAllSymptoms();
  const queryLower = query.toLowerCase().trim();
  
  // Check for exact matches first
  const exactMatches = allSymptoms.filter(symptom => 
    symptom.includes(queryLower) || queryLower.includes(symptom)
  );
  
  if (exactMatches.length > 0) {
    return {
      hasExactMatch: true,
      exactMatches: exactMatches.slice(0, maxSuggestions),
      suggestions: [],
      originalQuery: query
    };
  }
  
  // Find similar symptoms using spell checking
  const suggestions = [];
  
  allSymptoms.forEach(symptom => {
    const similarity = calculateSimilarity(queryLower, symptom);
    if (similarity >= threshold) {
      suggestions.push({
        symptom: symptom,
        similarity: similarity,
        distance: levenshteinDistance(queryLower, symptom)
      });
    }
  });
  
  // Sort by similarity (highest first) and then by distance (lowest first)
  suggestions.sort((a, b) => {
    if (b.similarity !== a.similarity) {
      return b.similarity - a.similarity;
    }
    return a.distance - b.distance;
  });
  
  return {
    hasExactMatch: false,
    exactMatches: [],
    suggestions: suggestions.slice(0, maxSuggestions).map(item => item.symptom),
    originalQuery: query
  };
}

/**
 * Find symptoms data for spell-corrected queries
 * @param {string} query - User input query
 * @returns {Object} - Object containing matched symptoms and spell suggestions
 */
export function searchWithSpellCheck(query) {
  const symptomsData = loadSymptomsData();
  const queryLower = query.toLowerCase().trim();
  
  // First, try exact matching
  const exactMatches = symptomsData.filter(item => 
    item.symptoms.some(symptom => 
      symptom.toLowerCase().includes(queryLower)
    )
  );
  
  if (exactMatches.length > 0) {
    return {
      matches: exactMatches,
      spellSuggestions: null,
      hasSpellingSuggestions: false,
      originalQuery: query
    };
  }
  
  // If no exact matches, try spell checking
  const spellCheck = findSpellSuggestions(query, 60, 3);
  
  if (spellCheck.suggestions.length > 0) {
    // Try to find matches for the suggested spellings
    const suggestedMatches = [];
    
    spellCheck.suggestions.forEach(suggestion => {
      const matches = symptomsData.filter(item => 
        item.symptoms.some(symptom => 
          symptom.toLowerCase().includes(suggestion)
        )
      );
      suggestedMatches.push(...matches);
    });
    
    // Remove duplicates
    const uniqueMatches = suggestedMatches.filter((item, index, self) => 
      index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
    );
    
    return {
      matches: uniqueMatches,
      spellSuggestions: spellCheck.suggestions,
      hasSpellingSuggestions: true,
      originalQuery: query
    };
  }
  
  return {
    matches: [],
    spellSuggestions: [],
    hasSpellingSuggestions: false,
    originalQuery: query
  };
}


