const express = require('express');
const User = require('../models/User');
const Mechanic = require('../models/Mechanic');
const ServiceRequest = require('../models/ServiceRequest');
const Payment = require('../models/Payment');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all mechanics
router.get('/mechanics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const mechanics = await Mechanic.find()
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ mechanics });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all service requests
router.get('/requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate('userId', 'name email phone')
      .populate({
        path: 'mechanicId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all payments
router.get('/payments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('serviceRequestId')
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalMechanics = await Mechanic.countDocuments();
    const totalRequests = await ServiceRequest.countDocuments();
    const completedRequests = await ServiceRequest.countDocuments({ status: 'completed' });
    const pendingRequests = await ServiceRequest.countDocuments({ status: 'pending' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalMechanics,
        totalRequests,
        completedRequests,
        pendingRequests,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update service request status (admin override)
router.patch('/requests/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ message: 'Request updated', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;