import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import symptomsRoutes from './routes/symptomsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import path from 'path';
import medicinesRoutes from './routes/medicinesRoutes.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ChatMessage from './models/chatMessage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set default environment variables if not provided
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-app';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'your-app-password';
// Expect GEMINI_API_KEY to be provided via environment (.env)

console.log('Environment variables loaded. Using defaults for development.');

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
// Simple request logger to debug incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));
app.use(express.static(path.join(process.cwd(), 'client', 'dist')));

// Explicit download endpoint to avoid SPA fallback interfering
app.get('/uploads/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const filePath = path.join(process.cwd(), 'server', 'uploads', type, filename);
  res.download(filePath, (err) => {
    if (err) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', symptomsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', chatRoutes);
app.use('/api', prescriptionRoutes);
app.use('/api', medicinesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!'
  });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client', 'dist', 'index.html'));
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('sendMessage', async (payload) => {
    try {
      const { roomId, senderId, receiverId, message = '', fileUrl = '' } = payload || {};
      if (!roomId || !senderId || !receiverId || (!message && !fileUrl)) return;

      const chatMessage = await ChatMessage.create({ senderId, receiverId, message, fileUrl });
      const data = {
        _id: chatMessage._id,
        senderId,
        receiverId,
        message,
        fileUrl,
        createdAt: chatMessage.createdAt,
      };

      io.to(roomId).emit('receiveMessage', data);
    } catch (err) {
      console.error('sendMessage error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    const newPort = PORT + 1;
    const newServer = app.listen(newPort, () => {
      console.log(`Server running on port ${newPort}`);
    });
  } else {
    console.error('Server error:', err);
  }
});
