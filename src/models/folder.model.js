// models/folder.model.js
import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true, trim: true },
  color:  { type: String, default: '#ccc' },      // optional styling
}, { timestamps: true });

export default mongoose.model('Folder', folderSchema);
