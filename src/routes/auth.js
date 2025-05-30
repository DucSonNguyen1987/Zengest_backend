const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  changePassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile
} = require('../middleware/validation');

const router = express.Router();

// Routes publiques
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Routes protégées
router.get('/me', auth, getMe);
router.put('/profile', auth, validateUpdateProfile, updateProfile);
router.put('/change-password', auth, changePassword);

module.exports = router;