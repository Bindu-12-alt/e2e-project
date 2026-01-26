const mongoose = require('mongoose');

const mechanicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  experience: { type: Number, required: true },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  isAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  completedServices: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mechanic', mechanicSchema);