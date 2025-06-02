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

      // Debug pour vérifier la structure
console.log('🔍 DEBUG Auth - User loaded:', {
  userId: user._id.toString(),
  role: user.role,
  restaurantId: user.restaurantId?._id?.toString() || 'N/A',
  restaurantName: user.restaurantId?.name || 'N/A'
});
      
      // Vérifier si le compte est actif
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé'
        });
      }
      
      // AMÉLIORATION: Vérifier le restaurantId pour les utilisateurs non-admin
      if (user.role !== 'admin') {
        // Si l'utilisateur a un restaurantId dans la DB mais la population a échoué
        if (user.restaurantId === null && user.toObject().restaurantId) {
          console.warn(`⚠️  Population échouée pour l'utilisateur ${user._id}, restaurant ${user.toObject().restaurantId} non trouvé`);
          return res.status(403).json({
            success: false,
            message: 'Restaurant assigné non trouvé'
          });
        }
        
        // Si l'utilisateur n'a pas de restaurant assigné du tout (sauf admin)
        if (!user.restaurantId && user.role !== 'admin') {
          console.warn(`⚠️  Utilisateur ${user._id} (${user.role}) sans restaurant assigné`);
          return res.status(403).json({
            success: false,
            message: 'Aucun restaurant assigné',
            debug: {
              userId: user._id,
              userRole: user.role,
              hasRestaurantId: !!user.restaurantId
            }
          });
        }
      }
      
      // Debug logging pour tracer les problèmes
      console.log('🔐 AUTH SUCCESS:', {
        userId: user._id,
        userRole: user.role,
        restaurantId: user.restaurantId?._id || user.restaurantId,
        restaurantName: user.restaurantId?.name || 'N/A',
        isPopulated: typeof user.restaurantId === 'object'
      });
      
      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();
      
    } catch (tokenError) {
      console.error('❌ Erreur de token:', tokenError.message);
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur middleware auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

module.exports = { auth };