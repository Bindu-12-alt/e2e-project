const express = require('express');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const ServiceRequest = require('../models/ServiceRequest');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { serviceRequestId, amount } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${serviceRequestId}`
    };

    const order = await razorpay.orders.create(options);

    const payment = new Payment({
      serviceRequestId,
      userId: req.user.id,
      amount,
      razorpayOrderId: order.id
    });

    await payment.save();

    res.json({ order, paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify payment
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, paymentId } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.status = 'completed';
    await payment.save();

    // Update service request
    await ServiceRequest.findByIdAndUpdate(payment.serviceRequestId, {
      actualCost: payment.amount,
      status: 'completed',
      completedAt: new Date()
    });

    res.json({ message: 'Payment verified successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;