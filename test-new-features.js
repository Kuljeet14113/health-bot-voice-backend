import mongoose from 'mongoose';
import Appointment from './models/appointment.js';
import User from './models/user.js';
import Doctor from './models/doctor.js';

// Test script for new appointment features
const testNewFeatures = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/healthbot', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Test 1: Check if appointment model has new fields
    console.log('\n=== Test 1: Appointment Model Fields ===');
    const appointmentSchema = Appointment.schema.obj;
    console.log('patientId field exists:', 'patientId' in appointmentSchema);
    console.log('medicines field exists:', 'medicines' in appointmentSchema);
    console.log('All appointment fields:', Object.keys(appointmentSchema));

    // Test 2: Check if we have any existing appointments
    console.log('\n=== Test 2: Existing Appointments ===');
    const totalAppointments = await Appointment.countDocuments();
    console.log('Total appointments:', totalAppointments);
    
    const appointmentsWithPatientId = await Appointment.countDocuments({ patientId: { $exists: true } });
    console.log('Appointments with patientId:', appointmentsWithPatientId);

    // Test 3: Check if we have users and doctors
    console.log('\n=== Test 3: Users and Doctors ===');
    const totalUsers = await User.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    console.log('Total users:', totalUsers);
    console.log('Total doctors:', totalDoctors);

    // Test 4: Sample appointment with new fields
    console.log('\n=== Test 4: Sample Appointment Creation ===');
    const sampleAppointment = {
      patientName: 'Test Patient',
      patientEmail: 'test@example.com',
      patientPhone: '1234567890',
      patientAge: 30,
      patientGender: 'Male',
      doctorId: new mongoose.Types.ObjectId(),
      doctorName: 'Dr. Test',
      doctorEmail: 'doctor@example.com',
      doctorSpecialization: 'General Medicine',
      doctorHospital: 'Test Hospital',
      appointmentDate: new Date(),
      appointmentTime: '10:00 AM',
      reason: 'Test appointment',
      symptoms: 'Test symptoms',
      notes: 'Test notes',
      medicines: 'Test medicines',
      diagnosis: 'Test diagnosis',
      status: 'pending'
    };

    console.log('Sample appointment structure:', Object.keys(sampleAppointment));

    console.log('\n=== All Tests Completed Successfully ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run tests
testNewFeatures();
