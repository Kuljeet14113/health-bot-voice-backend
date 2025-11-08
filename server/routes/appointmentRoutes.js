import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate.js';
import {
  bookAppointment,
  getDoctorAvailability,
  getDoctorAppointments,
  getDoctorPendingAppointments,
  getPatientAppointments,
  updateAppointmentStatus,
  getAppointmentById,
  cancelAppointment,
  getAppointmentStats,
  getAllAppointments,
  getPatientHistoryWithDoctor,
  getPatientAppointmentsWithFilter,
  getDoctorAssignedPatients
} from '../controllers/Appointment.controller.js';

const router = express.Router();

// Rate limiter for appointment booking
const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 appointment bookings per 15 minutes
  message: {
    success: false,
    message: 'Too many appointment requests. Please wait 15 minutes before trying again.',
  },
});

// Public routes (no authentication required)
router.post('/book', appointmentLimiter, bookAppointment);
router.get('/doctor/:doctorId/availability', getDoctorAvailability);

// Protected routes (authentication required)
router.get('/doctor/:doctorId', authenticate, getDoctorAppointments);
router.get('/doctor/:doctorId/pending', authenticate, getDoctorPendingAppointments);
router.get('/patient/:patientEmail', authenticate, getPatientAppointments);
router.get('/stats/:doctorId', authenticate, getAppointmentStats);
router.get('/:appointmentId', authenticate, getAppointmentById);
router.put('/:appointmentId/status', authenticate, updateAppointmentStatus);
router.put('/:appointmentId/cancel', authenticate, cancelAppointment);

// New routes for patient history and appointments
router.get('/doctor/:doctorId/patient/:patientId/history', authenticate, getPatientHistoryWithDoctor);
router.get('/patient/:patientId/appointments', authenticate, getPatientAppointmentsWithFilter);
// Assigned patients for a doctor
router.get('/doctor/:doctorId/patients', authenticate, getDoctorAssignedPatients);

// Admin routes
router.get('/admin/all', authenticate, getAllAppointments);

export default router;
