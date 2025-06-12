// src/middleware/validation.js - VERSION SIMPLE QUI FONCTIONNE

const validateRegister = (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;
  
  if (!firstName || firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Prénom requis (minimum 2 caractères)'
    });
  }
  
  if (!lastName || lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nom requis (minimum 2 caractères)'
    });
  }
  
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email valide requis'
    });
  }
  
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mot de passe requis (minimum 6 caractères)'
    });
  }
  
  const validRoles = ['admin', 'owner', 'manager', 'staff', 'staff_floor', 'staff_bar', 'staff_kitchen'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Rôle invalide'
    });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email et mot de passe requis'
    });
  }
  
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Format email invalide'
    });
  }
  
  next();
};

const validateUpdateProfile = (req, res, next) => {
  const { firstName, lastName, phone } = req.body;
  
  if (firstName && firstName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Prénom invalide (minimum 2 caractères)'
    });
  }
  
  if (lastName && lastName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nom invalide (minimum 2 caractères)'
    });
  }
  
  if (phone && phone.length > 0 && !/^[\d\s+.\-()]+$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Format téléphone invalide'
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile
};
