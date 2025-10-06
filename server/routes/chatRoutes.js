import express from 'express';
import { processChatMessage, getChatHistory } from '../controllers/Chat.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ChatMessage from '../models/chatMessage.js';
import User from '../models/user.js';

const router = express.Router();

// Process chat message (voice or text)
router.post('/chat', authenticate, processChatMessage);

// Get chat history for a user
router.get('/chat/history/:userId', authenticate, getChatHistory);

// ===== Real-time doctor-patient chat APIs =====

// Ensure chat uploads directory exists
const chatUploadDir = path.join(process.cwd(), 'server', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

// List distinct patient chat rooms for a doctor
router.get('/chat/rooms', authenticate, async (req, res) => {
  try {
    const { doctorId } = req.query;
    if (!doctorId) return res.status(400).json({ success: false, message: 'doctorId is required' });

    const docs = await ChatMessage.find({
      $or: [{ senderId: doctorId }, { receiverId: doctorId }],
    })
      .select('senderId receiverId')
      .lean();

    const patientIdSet = new Set();
    for (const d of docs) {
      const otherId = String(d.senderId) === String(doctorId) ? String(d.receiverId) : String(d.senderId);
      if (otherId !== String(doctorId)) patientIdSet.add(otherId);
    }

    const patientIds = Array.from(patientIdSet);
    const users = await User.find({ _id: { $in: patientIds } }).select('name').lean();
    const nameMap = new Map(users.map((u) => [String(u._id), u.name]));

    const rooms = patientIds.map((pid) => ({
      patientId: pid,
      patientName: nameMap.get(pid) || 'Patient',
      roomId: `${doctorId}_${pid}`,
    }));

    return res.json({ success: true, rooms });
  } catch (err) {
    console.error('List rooms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat rooms' });
  }
});

// Multer storage for chat files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common docs and images; adjust if needed
  const allowed = /pdf|doc|docx|jpg|jpeg|png|gif|webp|txt/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype.toLowerCase());
  if (extname && mimetype) return cb(null, true);
  cb(new Error('Unsupported file type'));
};

const chatUpload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter });

// Upload a chat file
router.post('/upload', authenticate, chatUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    return res.json({ success: true, fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'File upload failed' });
  }
});

// Fetch chat history between two users via roomId = doctorId_patientId
router.get('/chat/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const [id1, id2] = roomId.split('_');
    if (!id1 || !id2) return res.status(400).json({ success: false, message: 'Invalid roomId' });

    const messages = await ChatMessage.find({
      $or: [
        { senderId: id1, receiverId: id2 },
        { senderId: id2, receiverId: id1 },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('Fetch chat history error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

export default router;
