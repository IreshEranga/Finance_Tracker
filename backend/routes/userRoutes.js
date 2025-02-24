const express = require('express');
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const {protect, adminProtect } = require('../middleware/authMiddleware');


const router = express.Router();


router.get('/', protect, adminProtect , getUsers);       // Get all users
router.get('/:id', protect, getUserById); // Get user by user id
router.put('/:id', protect, updateUser);  // Update user
router.delete('/:id', protect, adminProtect , deleteUser); // Delete user


module.exports = router;