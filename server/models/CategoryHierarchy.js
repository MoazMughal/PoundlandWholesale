import mongoose from 'mongoose';

// Stores parent→children relationships for category dropdowns
// Does NOT affect product category strings — purely for navigation UI
const categoryHierarchySchema = new mongoose.Schema({
  parent: { type: String, required: true, trim: true, unique: true },
  children: [{ type: String, trim: true }]
}, { timestamps: true });

export default mongoose.model('CategoryHierarchy', categoryHierarchySchema);
