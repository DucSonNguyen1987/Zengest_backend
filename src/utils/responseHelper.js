// src/utils/responseHelper.js - FICHIER MANQUANT À CRÉER

/**
 * Utilitaires pour les réponses HTTP standardisées
 */

/**
 * Envoyer une réponse d'erreur standardisée
 */
const sendErrorResponse = (res, message, statusCode = 500, details = null) => {
  const errorResponse = {
    success: false,
    message: message || 'Erreur serveur',
    timestamp: new Date().toISOString(),
    status: statusCode
  };

  // Ajouter les détails en développement
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.details = details;
    errorResponse.stack = details.stack;
  }

  // Logger l'erreur
  if (statusCode >= 500) {
    console.error('Erreur serveur:', { message, statusCode, details });
  } else if (statusCode >= 400) {
    console.warn('Erreur client:', { message, statusCode });
  }

  return res.status(statusCode).json(errorResponse);
};

/**
 * Envoyer une réponse de succès standardisée
 */
const sendSuccessResponse = (res, data = null, message = 'Succès', statusCode = 200) => {
  const successResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    status: statusCode
  };

  if (data !== null) {
    successResponse.data = data;
  }

  return res.status(statusCode).json(successResponse);
};

/**
 * Envoyer une réponse avec pagination
 */
const sendPaginatedResponse = (res, data, pagination, message = 'Données récupérées') => {
  return res.json({
    success: true,
    message,
    data: {
      items: data,
      pagination
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Envoyer une réponse de validation d'erreur
 */
const sendValidationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Erreurs de validation',
    errors: Array.isArray(errors) ? errors : [errors],
    timestamp: new Date().toISOString(),
    status: 400
  });
};

/**
 * Wrapper pour les contrôleurs async (gestion automatique d'erreurs)
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de gestion d'erreur global
 */
const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur serveur interne';

  // Erreurs de validation Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Erreur de validation';
    const errors = Object.values(err.errors).map(e => e.message);
    return sendValidationErrorResponse(res, errors);
  }

  // Erreurs de cast Mongoose (ID invalide)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID invalide';
  }

  // Erreurs de clé dupliquée MongoDB
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Données déjà existantes';
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  return sendErrorResponse(res, message, statusCode, err);
};

module.exports = {
  sendErrorResponse,
  sendSuccessResponse,
  sendPaginatedResponse,
  sendValidationErrorResponse,
  asyncHandler,
  globalErrorHandler
};