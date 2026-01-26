const express = require('express');
const Mechanic = require('../models/Mechanic');
const ServiceRequest = require('../models/ServiceRequest');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Update mechanic location
router.patch('/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const mechanic = await Mechanic.findOne({ userId: req.user.id });
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic profile not found' });
    }

    mechanic.currentLocation = { latitude, longitude };
    await mechanic.save();

    res.json({ message: 'Location updated successfully', mechanic });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Toggle availability
router.patch('/availability', authMiddleware, async (req, res) => {
  try {
    const mechanic = await Mechanic.findOne({ userId: req.user.id });
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic profile not found' });
    }

    mechanic.isAvailable = !mechanic.isAvailable;
    await mechanic.save();

    res.json({ message: 'Availability updated', mechanic });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get assigned requests for mechanic
router.get('/my-jobs', authMiddleware, async (req, res) => {
  try {
    const mechanic = await Mechanic.findOne({ userId: req.user.id });
    if (!mechanic) {
      return res.status(404).json({ message: 'Mechanic profile not found' });
    }

    const jobs = await ServiceRequest.find({ mechanicId: mechanic._id })
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;