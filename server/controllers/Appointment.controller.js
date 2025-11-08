import Appointment from '../models/appointment.js';
import Doctor from '../models/doctor.js';
import mongoose from 'mongoose';
import { sendAppointmentConfirmationEmail, sendAppointmentCancellationEmail } from '../utils/emailService.js';

// Get booked time slots for a doctor on a specific date (public)
export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' });
    }

    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    }).select('appointmentTime status');

    const bookedSlots = appointments.map(a => a.appointmentTime);

    res.status(200).json({ success: true, bookedSlots });
  } catch (error) {
    console.error('Get doctor availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
};

// Book a new appointment
export const bookAppointment = async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      patientAge,
      patientGender,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      symptoms,
      notes,
      isUrgent
    } = req.body;

    // Validate required fields
    if (!patientName || !patientEmail || !patientPhone || !patientAge || !patientGender || 
        !doctorId || !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(patientPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    // Validate age
    if (patientAge < 0 || patientAge > 150) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid age'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if doctor is verified
    if (!doctor.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not verified yet'
      });
    }

    // Check for conflicting appointments
    const appointmentDateObj = new Date(appointmentDate);
    const existingAppointment = await Appointment.findOne({
      doctorId: doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDateObj.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDateObj.setHours(23, 59, 59, 999))
      },
      appointmentTime: appointmentTime,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked. Please choose another time.'
      });
    }

    // Create new appointment
    const appointment = new Appointment({
      patientId: patientId || null, // Include patientId if provided
      patientName,
      patientEmail,
      patientPhone,
      patientAge,
      patientGender,
      doctorId,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      doctorSpecialization: doctor.specialization,
      doctorHospital: doctor.hospital,
      appointmentDate: appointmentDateObj,
      appointmentTime,
      reason,
      symptoms: symptoms || '',
      notes: notes || '',
      isUrgent: isUrgent || false
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully. You will receive an email notification once the doctor reviews your request.',
      appointment: {
        id: appointment._id,
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment. Please try again.'
    });
  }
};

// Get distinct patients assigned to a specific doctor (based on appointments)
export const getDoctorAssignedPatients = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    // Verify that the requesting user is the doctor or admin
    if (req.user._id !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own patients.'
      });
    }

    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // Aggregate unique patients this doctor has appointments with
    const results = await Appointment.aggregate([
      { $match: { doctorId: doctorObjectId } },
      { $sort: { appointmentDate: -1 } },
      {
        $group: {
          _id: {
            patientId: '$patientId',
            patientEmail: '$patientEmail'
          },
          latestAppointment: { $first: '$$ROOT' },
          totalAppointments: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          patient: {
            _id: {
              // Prefer patientId if exists, otherwise null
              $ifNull: ['$_id.patientId', null]
            },
            email: '$_id.patientEmail',
            name: '$latestAppointment.patientName',
            phone: '$latestAppointment.patientPhone',
            gender: '$latestAppointment.patientGender',
            age: '$latestAppointment.patientAge'
          },
          lastVisit: '$latestAppointment.appointmentDate',
          totalAppointments: 1
        }
      },
      { $sort: { lastVisit: -1 } }
    ]);

    res.status(200).json({
      success: true,
      patients: results,
      count: results.length
    });

  } catch (error) {
    console.error('Get doctor assigned patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned patients'
    });
  }
};

// Get appointments for a specific doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, date } = req.query;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    // Verify that the requesting user is the doctor or has permission
    if (req.user._id !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own appointments.'
      });
    }

    // Build query
    let query = { doctorId: new mongoose.Types.ObjectId(doctorId) };

    if (status) {
      query.status = status;
    }

    if (date) {
      const dateObj = new Date(date);
      query.appointmentDate = {
        $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
        $lt: new Date(dateObj.setHours(23, 59, 59, 999))
      };
    }

    const appointments = await Appointment.find(query)
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

// Get appointments for a specific patient
export const getPatientAppointments = async (req, res) => {
  try {
    const { patientEmail } = req.params;
    const { status } = req.query;

    // Build query
    let query = { patientEmail };

    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization hospital location phone')
      .sort({ appointmentDate: -1, appointmentTime: 1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes, prescription, diagnosis, medicines } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'confirmed', 'cancelled', 'completed', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update appointment
    appointment.status = status;
    if (notes) appointment.notes = notes;
    if (prescription) appointment.prescription = prescription;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (medicines) appointment.medicines = medicines;

    await appointment.save();

    // Get doctor information for email
    const doctor = await Doctor.findById(appointment.doctorId);

    // Send appropriate email based on status
    try {
      if (status === 'approved') {
        await sendAppointmentApprovalEmail(appointment, doctor);
      } else if (status === 'rejected') {
        await sendAppointmentRejectionEmail(appointment, doctor);
      } else if (status === 'confirmed') {
        await sendAppointmentConfirmationEmail(appointment, doctor);
      } else if (status === 'cancelled') {
        await sendAppointmentCancellationEmail(appointment, doctor);
      }
    } catch (emailError) {
      console.error('Failed to send status email:', emailError);
      // Don't fail the status update if email fails
    }

    res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status'
    });
  }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'name specialization hospital location phone email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      appointment
    });

  } catch (error) {
    console.error('Get appointment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment'
    });
  }
};

// Cancel appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed appointment'
      });
    }

    appointment.status = 'cancelled';
    if (reason) {
      appointment.notes = appointment.notes ? 
        `${appointment.notes}\nCancellation reason: ${reason}` : 
        `Cancellation reason: ${reason}`;
    }

    await appointment.save();

    // Get doctor information for email
    const doctor = await Doctor.findById(appointment.doctorId);

    // Send cancellation email
    try {
      await sendAppointmentCancellationEmail(appointment, doctor);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
};

// Get pending appointments for a specific doctor
export const getDoctorPendingAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    // Verify that the requesting user is the doctor or has permission
    if (req.user._id !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own appointments.'
      });
    }

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      appointments,
      count: appointments.length
    });

  } catch (error) {
    console.error('Get doctor pending appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending appointments'
    });
  }
};

// Get appointment statistics for doctor dashboard
export const getAppointmentStats = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // Get status-based statistics
    const stats = await Appointment.aggregate([
      { $match: { doctorId: doctorObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate total appointments
    const totalAppointments = await Appointment.countDocuments({ doctorId: doctorObjectId });
    
    // Today's appointments (fixed date calculation)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const todayAppointments = await Appointment.countDocuments({
      doctorId: doctorObjectId,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Confirmed appointments for today
    const confirmedToday = await Appointment.countDocuments({
      doctorId: doctorObjectId,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: 'confirmed'
    });

    // Completed appointments
    const completedAppointments = await Appointment.countDocuments({
      doctorId: doctorObjectId,
      status: 'completed'
    });

    // Pending appointments (for pending requests count)
    const pendingAppointments = await Appointment.countDocuments({
      doctorId: doctorObjectId,
      status: 'pending'
    });

    // Upcoming appointments
    const upcomingAppointments = await Appointment.countDocuments({
      doctorId: doctorObjectId,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Convert stats array to object with default values
    const byStatus = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      approved: 0,
      rescheduled: 0
    };

    stats.forEach(stat => {
      byStatus[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalAppointments,
        today: todayAppointments,
        confirmedToday: confirmedToday,
        completed: completedAppointments,
        pending: pendingAppointments,
        upcoming: upcomingAppointments,
        byStatus: byStatus
      }
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment statistics'
    });
  }
};

// Get all appointments (for admin)
export const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId, patientEmail, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;
    if (patientEmail) query.patientEmail = patientEmail;

    const skip = (page - 1) * limit;

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization hospital')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      appointments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
};

// Get patient's appointment history with a specific doctor
export const getPatientHistoryWithDoctor = async (req, res) => {
  try {
    const { doctorId, patientId } = req.params;

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }

    // Verify that the requesting user is the doctor or has permission
    if (req.user._id !== doctorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own patients\' history.'
      });
    }

    let filteredAppointments = [];

    if (mongoose.Types.ObjectId.isValid(patientId)) {
      // Path param is a valid ObjectId: try both patientId and patient's email
      const User = mongoose.model('User');
      const patient = await User.findById(patientId).select('email');

      const appointments = await Appointment.find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        $or: [
          { patientId: new mongoose.Types.ObjectId(patientId) },
          { patientEmail: patient?.email }
        ]
      })
        .populate('patientId', 'name email')
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .select('-__v');

      // Ensure correct patient
      filteredAppointments = appointments.filter(appointment => {
        if (appointment.patientId) {
          return appointment.patientId._id.toString() === patientId;
        }
        return appointment.patientEmail === patient?.email;
      });
    } else {
      // Treat patientId as email string for backward compatibility
      const email = patientId;
      const appointments = await Appointment.find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        patientEmail: email
      })
        .populate('patientId', 'name email')
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .select('-__v');
      filteredAppointments = appointments;
    }

    res.status(200).json({
      success: true,
      appointments: filteredAppointments,
      count: filteredAppointments.length
    });

  } catch (error) {
    console.error('Get patient history with doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient history'
    });
  }
};

// Get patient's appointments with date filtering
export const getPatientAppointmentsWithFilter = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { filter } = req.query; // 3months, 6months, 12months

    // Validate patientId format
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    // Verify that the requesting user is the patient or has permission
    if (req.user._id !== patientId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own appointments.'
      });
    }

    // Calculate date filter
    let dateFilter = {};
    const now = new Date();
    
    if (filter) {
      let monthsBack = 3; // default
      switch (filter) {
        case '3months':
          monthsBack = 3;
          break;
        case '6months':
          monthsBack = 6;
          break;
        case '12months':
          monthsBack = 12;
          break;
        default:
          monthsBack = 3;
      }
      
      const filterDate = new Date();
      filterDate.setMonth(filterDate.getMonth() - monthsBack);
      dateFilter.appointmentDate = { $gte: filterDate };
    }

    // Get patient email from User model for backward compatibility
    const User = mongoose.model('User');
    const patient = await User.findById(patientId).select('email');
    
    // Build query
    const query = {
      $or: [
        { patientId: new mongoose.Types.ObjectId(patientId) },
        { patientEmail: patient?.email } // Match by email for backward compatibility
      ],
      ...dateFilter
    };

    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization hospital location phone email')
      .populate('patientId', 'name email')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .select('-__v');

    // Filter appointments to ensure they belong to the correct patient
    const filteredAppointments = appointments.filter(appointment => {
      if (appointment.patientId) {
        return appointment.patientId._id.toString() === patientId;
      }
      // For backward compatibility, match by email
      return appointment.patientEmail === patient?.email;
    });

    // Separate upcoming and completed appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingAppointments = filteredAppointments.filter(apt => 
      new Date(apt.appointmentDate) >= today
    );
    
    const completedAppointments = filteredAppointments.filter(apt => 
      new Date(apt.appointmentDate) < today
    );

    res.status(200).json({
      success: true,
      appointments: filteredAppointments,
      upcomingAppointments,
      completedAppointments,
      count: filteredAppointments.length,
      upcomingCount: upcomingAppointments.length,
      completedCount: completedAppointments.length
    });

  } catch (error) {
    console.error('Get patient appointments with filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient appointments'
    });
  }
};
