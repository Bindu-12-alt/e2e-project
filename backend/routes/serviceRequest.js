const express = require('express');
const ServiceRequest = require('../models/ServiceRequest');
const Mechanic = require('../models/Mechanic');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Create service request
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { vehicleType, problemDescription, location, urgency } = req.body;

    const serviceRequest = new ServiceRequest({
      userId: req.user.id,
      vehicleType,
      problemDescription,
      location,
      urgency: urgency || 'medium'
    });

    await serviceRequest.save();

    // Find nearby available mechanics (simplified - within 50km radius)
    const nearbyMechanics = await Mechanic.find({
      isAvailable: true,
      'currentLocation.latitude': {
        $gte: location.latitude - 0.5,
        $lte: location.latitude + 0.5
      },
      'currentLocation.longitude': {
        $gte: location.longitude - 0.5,
        $lte: location.longitude + 0.5
      }
    }).populate('userId', 'name phone');

    res.status(201).json({
      message: 'Service request created successfully',
      serviceRequest,
      nearbyMechanics
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's service requests
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ userId: req.user.id })
      .populate('mechanicId')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service request status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    request.status = status;
    if (status === 'completed') {
      request.completedAt = new Date();
    }

    await request.save();

    res.json({ message: 'Status updated successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign mechanic to request
router.patch('/:id/assign', authMiddleware, async (req, res) => {
  try {
    const { mechanicId } = req.body;
    
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    request.mechanicId = mechanicId;
    request.status = 'assigned';
    await request.save();

    // Update mechanic availability
    await Mechanic.findByIdAndUpdate(mechanicId, { isAvailable: false });

    res.json({ message: 'Mechanic assigned successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;