const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const auth = async (req, res, next) => {
  try {
    let token;
    
    // Récupérer le token depuis les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé, token manquant'
      });
    }
    
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Récupérer l'utilisateur depuis la base de données
      const user = await User.findById(decoded.id)
        .populate('restaurantId', 'name address')
        .select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide, utilisateur non trouvé'
        });
      }
      
      // Vérifier si le compte est actif
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé'
        });
      }
      
      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();
      
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
  } catch (error) {
    console.error('Erreur middleware auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

module.exports = { auth };