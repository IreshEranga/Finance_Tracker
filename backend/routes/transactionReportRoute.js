const express = require('express');
const { generateReport } = require('../controllers/transactionReportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, generateReport); // ✅ Get Reports for Users & Admins

module.exports = router;
