const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic' },
  vehicleType: { type: String, required: true },
  problemDescription: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
  },
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  estimatedCost: { type: Number },
  actualCost: { type: Number },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);