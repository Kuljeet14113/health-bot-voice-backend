import express from 'express';
import { 
  getPendingDoctors, 
  getAllDoctors, 
  approveDoctor, 
  rejectDoctor, 
  getDoctorCertificate 
} from '../controllers/Admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Apply admin check to all routes
router.use(requireAdmin);

// Admin routes
router.get('/doctors/pending', getPendingDoctors);
router.get('/doctors/all', getAllDoctors);
router.post('/doctors/:doctorId/approve', approveDoctor);
router.post('/doctors/:doctorId/reject', rejectDoctor);
router.get('/doctors/:doctorId/certificate', getDoctorCertificate);

export default router;
