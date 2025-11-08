import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
export default ChatMessage;
