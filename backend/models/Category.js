import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Category type is required'],
    enum: ['income', 'expense', 'both'],
    lowercase: true
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  icon: {
    type: String,
    default: 'folder'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isDefault;
    }
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  budget: {
    monthly: {
      type: Number,
      default: 0,
      min: [0, 'Budget cannot be negative']
    },
    yearly: {
      type: Number,
      default: 0,
      min: [0, 'Budget cannot be negative']
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
categorySchema.index({ userId: 1, type: 1 });
categorySchema.index({ isDefault: 1, type: 1 });
categorySchema.index({ isActive: 1 });

// Ensure unique category names per user and type
categorySchema.index({ name: 1, userId: 1, type: 1 }, { unique: true });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

export default mongoose.model('Category', categorySchema);
