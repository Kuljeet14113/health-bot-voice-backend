# Appointment Booking System

## Overview
This document describes the appointment booking system implemented for the HelthBot application. The system allows patients to book appointments with doctors and provides doctors with a dashboard to manage their appointments.

## Features

### For Patients
- Browse and search for doctors by specialization, location, and name
- Book appointments with detailed patient information
- Receive email confirmations for appointments
- View appointment status updates

### For Doctors
- View all appointments in a comprehensive dashboard
- See pending appointment requests that need approval
- Update appointment status (confirm, cancel, complete)
- View patient information and appointment details
- Receive appointment statistics

## API Endpoints

### Appointment Routes (`/api/appointments`)

#### Book Appointment
- **POST** `/book`
- **Description**: Book a new appointment
- **Body**: 
  ```json
  {
    "patientName": "string",
    "patientEmail": "string", 
    "patientPhone": "string",
    "patientAge": "number",
    "patientGender": "string",
    "doctorId": "string",
    "appointmentDate": "date",
    "appointmentTime": "string",
    "reason": "string",
    "symptoms": "string (optional)",
    "notes": "string (optional)",
    "isUrgent": "boolean (optional)"
  }
  ```

#### Get Doctor Appointments
- **GET** `/doctor/:doctorId`
- **Description**: Get all appointments for a specific doctor
- **Query Parameters**: 
  - `status`: Filter by appointment status
  - `date`: Filter by specific date
- **Headers**: `Authorization: Bearer <token>`

#### Get Patient Appointments
- **GET** `/patient/:patientEmail`
- **Description**: Get all appointments for a specific patient
- **Query Parameters**: `status` (optional)
- **Headers**: `Authorization: Bearer <token>`

#### Update Appointment Status
- **PUT** `/:appointmentId/status`
- **Description**: Update appointment status
- **Body**: 
  ```json
  {
    "status": "pending|confirmed|cancelled|completed|rescheduled",
    "notes": "string (optional)",
    "prescription": "string (optional)",
    "diagnosis": "string (optional)"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### Cancel Appointment
- **PUT** `/:appointmentId/cancel`
- **Description**: Cancel an appointment
- **Body**: 
  ```json
  {
    "reason": "string (optional)"
  }
  ```
- **Headers**: `Authorization: Bearer <token>`

#### Get Appointment Statistics
- **GET** `/stats/:doctorId`
- **Description**: Get appointment statistics for doctor dashboard
- **Headers**: `Authorization: Bearer <token>`

#### Get All Appointments (Admin)
- **GET** `/admin/all`
- **Description**: Get all appointments with pagination
- **Query Parameters**: 
  - `status`, `doctorId`, `patientEmail` (filters)
  - `page`, `limit` (pagination)
- **Headers**: `Authorization: Bearer <token>`

## Database Schema

### Appointment Model
```javascript
{
  // Patient Information
  patientName: String (required),
  patientEmail: String (required),
  patientPhone: String (required),
  patientAge: Number (required),
  patientGender: String (required, enum: ['Male', 'Female', 'Other']),
  
  // Doctor Information
  doctorId: ObjectId (required, ref: 'Doctor'),
  doctorName: String (required),
  doctorEmail: String (required),
  doctorSpecialization: String (required),
  doctorHospital: String (required),
  
  // Appointment Details
  appointmentDate: Date (required),
  appointmentTime: String (required),
  reason: String (required),
  symptoms: String (optional),
  notes: String (optional),
  
  // Status Management
  status: String (enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rescheduled'], default: 'pending'),
  
  // Additional Information
  isUrgent: Boolean (default: false),
  followUpRequired: Boolean (default: false),
  prescription: String (optional),
  diagnosis: String (optional),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## Email Notifications

The system sends automatic email notifications for:
- Appointment confirmation (when status changes to 'confirmed')
- Appointment cancellation (when status changes to 'cancelled')

Email templates are styled with HTML and include:
- Patient and doctor information
- Appointment details (date, time, reason)
- Hospital and location information
- Professional branding

## Frontend Components

### AppointmentBookingModal
- Modal component for booking appointments
- Form validation for all required fields
- Time slot selection
- Patient information collection
- Integration with booking API

### DoctorHome Dashboard
- Real-time appointment statistics
- Today's appointments display
- Pending appointment requests
- Status update functionality
- Patient information display

### DoctorFinder Integration
- "Book Appointment" button on each doctor card
- Opens appointment booking modal
- Seamless integration with existing doctor search

## Security Features

- Rate limiting on appointment booking (5 requests per 15 minutes)
- Authentication required for doctor-specific endpoints
- Input validation and sanitization
- Email format validation
- Phone number validation (10 digits)
- Age validation (0-150 years)
- Date validation (future dates only)

## Error Handling

- Comprehensive error messages for validation failures
- Graceful handling of email service failures
- Conflict detection for overlapping appointments
- User-friendly error messages in frontend

## Usage Examples

### Booking an Appointment
1. Patient searches for doctors in DoctorFinder
2. Clicks "Book Appointment" on desired doctor
3. Fills out appointment booking form
4. System validates input and checks for conflicts
5. Appointment is created with 'pending' status
6. Confirmation email is sent to patient
7. Doctor receives notification in dashboard

### Doctor Managing Appointments
1. Doctor logs into dashboard
2. Views pending appointment requests
3. Can confirm or cancel appointments
4. Updates appointment status as needed
5. Views patient information and appointment details
6. Monitors appointment statistics

## Future Enhancements

- Calendar integration
- Recurring appointments
- Appointment reminders
- Video consultation scheduling
- Payment integration
- Prescription management
- Medical record integration
