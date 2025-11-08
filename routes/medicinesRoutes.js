import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const medicinesFile = path.join(__dirname, '..', 'datasets', 'medicines.json');

function loadMedicines() {
  try {
    const raw = fs.readFileSync(medicinesFile, 'utf-8');
    const data = JSON.parse(raw);
    return data.conditions || [];
  } catch (err) {
    console.error('Failed to load medicines dataset:', err);
    return [];
  }
}

// List all conditions and medicines (doctor-only)
router.get('/medicines', authenticate, (req, res) => {
  const conditions = loadMedicines();
  res.json({ success: true, conditions });
});

// Get medicines by condition name (doctor-only)
router.get('/medicines/:condition', authenticate, (req, res) => {
  const { condition } = req.params;
  const conditions = loadMedicines();
  const entry = conditions.find(c => c.condition.toLowerCase() === decodeURIComponent(condition).toLowerCase());
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Condition not found' });
  }
  res.json({ success: true, condition: entry.condition, medicines: entry.medicines });
});

export default router;
