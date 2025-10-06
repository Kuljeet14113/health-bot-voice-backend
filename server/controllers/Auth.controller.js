import User from "../models/user.js";
import Doctor from "../models/doctor.js";
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOTP, sendOTPEmail } from '../utils/emailService.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;

    // Check if role is valid
    if (!['patient', 'doctor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be patient or doctor.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    const existingDoctor = await Doctor.findOne({ email });
    
    if (existingUser || existingDoctor) {
      return res.status(409).json({
        success: false,
        message: 'User already registered with this email.'
      });
    }

    const hashedPassword = await bcryptjs.hash(password, 12);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (role === 'doctor') {
      const { specialization, experience, hospital, phone, location } = req.body;
      
      // Validate required doctor fields
      if (!specialization || !experience || !hospital || !phone || !location) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required doctor information: specialization, experience, hospital, phone, and location.'
        });
      }

      // Create doctor registration
      const doctor = new Doctor({
        name,
        email,
        password: hashedPassword,
        role: 'doctor',
        isEmailVerified: false,
        specialization,
        experience,
        hospital,
        phone,
        location,
        otp: {
          code: otp,
          expiresAt: otpExpiry
        }
      });

      await doctor.save();

      // generate and store token upon registration (optional pre-verification token)
      try {
        const token = jwt.sign(
          { _id: doctor._id, name: doctor.name, email: doctor.email, role: 'doctor' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        await Doctor.findByIdAndUpdate(doctor._id, { $push: { tokens: { token, createdAt: new Date() } } });
      } catch (e) {
        console.error('Failed to create registration token for doctor:', e);
      }

      try {
        await sendOTPEmail(email, otp, name);
      } catch (emailError) {
        await Doctor.findByIdAndDelete(doctor._id);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.'
        });
      }
    } else {
      // Create patient registration
      const user = new User({
        name,
        email,
        password: hashedPassword,
        role: 'patient',
        isEmailVerified: false,
        otp: {
          code: otp,
          expiresAt: otpExpiry
        }
      });

      await user.save();

      // generate and store token upon registration (optional pre-verification token)
      try {
        const token = jwt.sign(
          { _id: user._id, name: user.name, email: user.email, role: 'patient' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        await User.findByIdAndUpdate(user._id, { $push: { tokens: { token, createdAt: new Date() } } });
      } catch (e) {
        console.error('Failed to create registration token for user:', e);
      }

      try {
        await sendOTPEmail(email, otp, name);
      } catch (emailError) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      email: email,
      role: role
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, role = 'patient' } = req.body;

    let user;
    if (role === 'doctor') {
      user = await Doctor.findOne({ email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.'
      });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    if (user.otp.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.',
      email: email,
      role: role
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    let user;
    let userRole;

    // Check if it's admin login (no OTP required)
    if (role === 'admin') {
      // Admin login with default credentials
      if (email === 'admin@healthbot.com' && password === 'Admin@123') {
        const adminUser = {
          _id: 'admin_id',
          name: 'Admin',
          email: 'admin@healthbot.com',
          role: 'admin',
          isEmailVerified: true
        };

        const token = jwt.sign(
          {
            _id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.status(200).json({
          success: true,
          message: 'Admin login successful.',
          user: adminUser,
          token: token
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin credentials.'
        });
      }
    }

    // Check for doctor login
    if (role === 'doctor') {
      user = await Doctor.findOne({ email });
      userRole = 'doctor';
    } else {
      // Default to patient login
      user = await User.findOne({ email });
      userRole = 'patient';
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in.'
      });
    }

    // If doctor, block login unless approved
    if (userRole === 'doctor') {
      if (user.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval'
        });
      }
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // store token
    try {
      if (userRole === 'doctor') {
        await Doctor.findByIdAndUpdate(user._id, { $push: { tokens: { token, createdAt: new Date() } } });
      } else {
        await User.findByIdAndUpdate(user._id, { $push: { tokens: { token, createdAt: new Date() } } });
      }
    } catch (e) {
      console.error('Failed to store token:', e);
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

export const resendOTP = async (req, res, next) => {
  try {
    const { email, role = 'patient' } = req.body;

    let user;
    if (role === 'doctor') {
      user = await Doctor.findOne({ email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.'
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = {
      code: otp,
      expiresAt: otpExpiry
    };
    await user.save();

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'New verification code sent to your email.'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.'
    });
  }
};

export const logout = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookie
    let token = req.cookies?.access_token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(200).json({ success: true, message: 'Logout successful.' });
    }

    // Verify token to get user info
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_e) {
      // If invalid/expired, treat as logged out
      return res.status(200).json({ success: true, message: 'Logout successful.' });
    }

    const userId = decoded._id || decoded.userId || decoded.id;
    const role = decoded.role;

    try {
      if (role === 'doctor') {
        await Doctor.findByIdAndUpdate(userId, { $pull: { tokens: { token } } });
      } else if (role === 'admin') {
        // no-op for hardcoded admin
      } else {
        await User.findByIdAndUpdate(userId, { $pull: { tokens: { token } } });
      }
    } catch (e) {
      console.error('Logout token removal error:', e);
    }

    res.status(200).json({ success: true, message: 'Logout successful.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed.'
    });
  }
};
 