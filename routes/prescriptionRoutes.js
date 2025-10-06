import express from 'express';
import { generatePrescription } from '../controllers/Prescription.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// Generate prescription
router.post('/prescription', authenticate, generatePrescription);

export default router;
