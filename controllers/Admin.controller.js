import Doctor from '../models/doctor.js';
import { sendOTPEmail, createTransporter } from '../utils/emailService.js';

// Get all pending doctors for admin review
export const getPendingDoctors = async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({ 
      status: 'pending',
      isEmailVerified: true 
    }).select('-password -otp');

    return res.status(200).json({
      success: true,
      doctors: pendingDoctors
    });
  } catch (error) {
    console.error('Get pending doctors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending doctors'
    });
  }
};

// Get all doctors with their status
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isEmailVerified: true })
      .select('-password -otp')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      doctors: doctors
    });
  } catch (error) {
    console.error('Get all doctors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors'
    });
  }
};

// Approve a doctor
export const approveDoctor = async (req, res) => {
  try {
    const id = req.params.id || req.params.doctorId;
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status: 'approved', isApproved: true },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    try { await sendDoctorApprovalEmail(doctor.email, doctor.name); } catch (e) { console.error('Approval email failed:', e); }

    return res.json({ message: 'Doctor approved successfully', doctor });
  } catch (err) {
    console.error('Error approving doctor:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reject a doctor
export const rejectDoctor = async (req, res) => {
  try {
    const id = req.params.id || req.params.doctorId;
    const { reason } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status: 'rejected', isApproved: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    try { await sendDoctorRejectionEmail(doctor.email, doctor.name, reason); } catch (e) { console.error('Rejection email failed:', e); }

    return res.json({ message: 'Doctor rejected successfully', doctor });
  } catch (err) {
    console.error('Error rejecting doctor:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get doctor certificate for preview
export const getDoctorCertificate = async (req, res) => {
  try {
    const id = req.params.id || req.params.doctorId;
    const doctor = await Doctor.findById(id).select('medicalCertificate identityCertificate name');
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (!doctor.medicalCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Return both certificate paths for frontend to display
    return res.status(200).json({
      success: true,
      certificatePath: doctor.medicalCertificate,
      identityCertificatePath: doctor.identityCertificate || null,
      doctorName: doctor.name
    });
  } catch (error) {
    console.error('Get doctor certificate error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate'
    });
  }
};

// Email functions
const sendDoctorApprovalEmail = async (email, doctorName) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.EMAIL_FROM || `"HelthBot" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
      from: fromName,
      to: email,
      subject: 'Registration Approved - HelthBot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">HelthBot</h1>
            <p style="margin-top: 10px; opacity: 0.9;">Registration Approved</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Congratulations Dr. ${doctorName}!</h2>
            <p style="color: #555;">Your registration request has been approved. You can now log in to your account.</p>
            
            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #333; margin-top: 0;">Next Steps</h3>
              <p style="margin: 8px 0;">• Log in to your doctor account</p>
              <p style="margin: 8px 0;">• Complete your profile setup</p>
              <p style="margin: 8px 0;">• Start accepting patient appointments</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #28a745; font-weight: bold;">Welcome to HelthBot!</p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Doctor approval email sent to', email, '| Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send doctor approval email:', error);
    throw error;
  }
};

const sendDoctorRejectionEmail = async (email, doctorName, reason) => {
  try {
    const transporter = createTransporter();
    const fromName = process.env.EMAIL_FROM || `"HelthBot" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
      from: fromName,
      to: email,
      subject: 'Registration Rejected - HelthBot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">HelthBot</h1>
            <p style="margin-top: 10px; opacity: 0.9;">Registration Rejected</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Dear Dr. ${doctorName},</h2>
            <p style="color: #555;">We regret to inform you that your registration request has been rejected.</p>
            
            ${reason ? `
            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #333; margin-top: 0;">Reason for Rejection</h3>
              <p style="margin: 8px 0; color: #666;">${reason}</p>
            </div>
            ` : ''}
            
            <p style="color: #666;">If you have any questions or would like to reapply, please contact our support team.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #dc3545; font-weight: bold;">Thank you for your interest in HelthBot.</p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Doctor rejection email sent to', email, '| Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send doctor rejection email:', error);
    throw error;
  }
};

