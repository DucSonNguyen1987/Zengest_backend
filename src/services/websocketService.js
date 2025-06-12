const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket info
    this.restaurantRooms = new Map(); // restaurantId -> Set of socket IDs
  }

  /**
   * Initialiser le service WebSocket
   */
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URLS?.split(',') || ["http://localhost:3001", "http://localhost:3002"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('Service WebSocket initialisé');
  }

  /**
   * Configuration des middlewares
   */
  setupMiddleware() {
    // Middleware d'authentification
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Token d\'authentification requis'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId)
          .populate('restaurant', '_id name')
          .select('_id firstName lastName role restaurant permissions');

        if (!user) {
          return next(new Error('Utilisateur non trouvé'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        socket.restaurantId = user.restaurant?._id?.toString();
        
        next();
      } catch (error) {
        logger.warn('Erreur d\'authentification WebSocket:', error.message);
        next(new Error('Token invalide'));
      }
    });

    // Middleware de logging
    this.io.use((socket, next) => {
      logger.info(`Connexion WebSocket: ${socket.user.firstName} ${socket.user.lastName} (${socket.user.role})`);
      next();
    });
  }

  /**
   * Configuration des gestionnaires d'événements
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // Événements génériques
      socket.on('disconnect', () => this.handleDisconnection(socket));
      socket.on('join-restaurant', (data) => this.handleJoinRestaurant(socket, data));
      socket.on('leave-restaurant', (data) => this.handleLeaveRestaurant(socket, data));
      
      // Événements plats du jour
      socket.on('daily-special-created', (data) => this.handleDailySpecialCreated(socket, data));
      socket.on('daily-special-updated', (data) => this.handleDailySpecialUpdated(socket, data));
      socket.on('daily-special-approved', (data) => this.handleDailySpecialApproved(socket, data));
      socket.on('daily-special-rejected', (data) => this.handleDailySpecialRejected(socket, data));
      
      // Événements commandes
      socket.on('order-created', (data) => this.handleOrderCreated(socket, data));
      socket.on('order-status-updated', (data) => this.handleOrderStatusUpdated(socket, data));
      
      // Événements tables
      socket.on('table-status-updated', (data) => this.handleTableStatusUpdated(socket, data));
      
      // Événements réservations
      socket.on('reservation-created', (data) => this.handleReservationCreated(socket, data));
      socket.on('reservation-updated', (data) => this.handleReservationUpdated(socket, data));
      
      // Événements de présence
      socket.on('user-typing', (data) => this.handleUserTyping(socket, data));
      socket.on('user-stopped-typing', (data) => this.handleUserStoppedTyping(socket, data));
    });
  }

  /**
   * Gérer une nouvelle connexion
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const restaurantId = socket.restaurantId;

    // Stocker les informations de connexion
    this.connectedUsers.set(userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Rejoindre automatiquement la room du restaurant
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`);
      
      if (!this.restaurantRooms.has(restaurantId)) {
        this.restaurantRooms.set(restaurantId, new Set());
      }
      this.restaurantRooms.get(restaurantId).add(socket.id);

      // Notifier les autres utilisateurs du restaurant
      socket.to(`restaurant:${restaurantId}`).emit('user-connected', {
        userId: userId,
        user: {
          id: socket.user._id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          role: socket.user.role
        },
        timestamp: new Date()
      });
    }

    // Envoyer les informations de connexion
    socket.emit('connected', {
      userId: userId,
      restaurantId: restaurantId,
      connectedUsers: this.getConnectedUsersForRestaurant(restaurantId),
      timestamp: new Date()
    });

    logger.info(`WebSocket connecté: ${socket.user.firstName} ${socket.user.lastName} (restaurant: ${restaurantId})`);
  }

  /**
   * Gérer une déconnexion
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    const restaurantId = socket.restaurantId;

    // Supprimer de la liste des utilisateurs connectés
    this.connectedUsers.delete(userId);

    // Supprimer de la room du restaurant
    if (restaurantId && this.restaurantRooms.has(restaurantId)) {
      this.restaurantRooms.get(restaurantId).delete(socket.id);
      
      if (this.restaurantRooms.get(restaurantId).size === 0) {
        this.restaurantRooms.delete(restaurantId);
      }

      // Notifier les autres utilisateurs
      socket.to(`restaurant:${restaurantId}`).emit('user-disconnected', {
        userId: userId,
        timestamp: new Date()
      });
    }

    logger.info(`WebSocket déconnecté: ${socket.user?.firstName} ${socket.user?.lastName}`);
  }

  /**
   * Rejoindre la room d'un restaurant
   */
  handleJoinRestaurant(socket, data) {
    const { restaurantId } = data;
    
    if (!restaurantId || socket.restaurantId !== restaurantId) {
      socket.emit('error', { message: 'Accès non autorisé au restaurant' });
      return;
    }

    socket.join(`restaurant:${restaurantId}`);
    
    socket.emit('joined-restaurant', {
      restaurantId,
      connectedUsers: this.getConnectedUsersForRestaurant(restaurantId),
      timestamp: new Date()
    });
  }

  /**
   * Quitter la room d'un restaurant
   */
  handleLeaveRestaurant(socket, data) {
    const { restaurantId } = data;
    socket.leave(`restaurant:${restaurantId}`);
    
    socket.emit('left-restaurant', {
      restaurantId,
      timestamp: new Date()
    });
  }

  /**
   * Plat du jour créé
   */
  handleDailySpecialCreated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    if (!this.hasPermission(socket.user, 'create_daily_special')) {
      return;
    }

    // Notifier tous les utilisateurs du restaurant
    this.io.to(`restaurant:${restaurantId}`).emit('daily-special-created', {
      special: data.special,
      createdBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      timestamp: new Date()
    });

    // Notifier spécifiquement les managers pour approbation
    this.notifyByRole(restaurantId, ['manager', 'owner', 'admin'], 'daily-special-approval-needed', {
      special: data.special,
      createdBy: socket.user
    });

    logger.info(`Plat du jour créé via WebSocket: ${data.special?.name} par ${socket.user.firstName}`);
  }

  /**
   * Plat du jour mis à jour
   */
  handleDailySpecialUpdated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    this.io.to(`restaurant:${restaurantId}`).emit('daily-special-updated', {
      special: data.special,
      updatedBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      changes: data.changes,
      timestamp: new Date()
    });

    logger.info(`Plat du jour mis à jour via WebSocket: ${data.special?.name} par ${socket.user.firstName}`);
  }

  /**
   * Plat du jour approuvé
   */
  handleDailySpecialApproved(socket, data) {
    const restaurantId = socket.restaurantId;
    
    if (!this.hasPermission(socket.user, 'approve_daily_special')) {
      return;
    }

    // Notifier tout le restaurant
    this.io.to(`restaurant:${restaurantId}`).emit('daily-special-approved', {
      special: data.special,
      approvedBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      timestamp: new Date()
    });

    // Notifier spécifiquement le créateur
    if (data.special.createdBy && data.special.createdBy !== socket.userId) {
      this.notifyUser(data.special.createdBy, 'your-daily-special-approved', {
        special: data.special,
        approvedBy: socket.user
      });
    }

    logger.info(`Plat du jour approuvé via WebSocket: ${data.special?.name} par ${socket.user.firstName}`);
  }

  /**
   * Plat du jour rejeté
   */
  handleDailySpecialRejected(socket, data) {
    const restaurantId = socket.restaurantId;
    
    if (!this.hasPermission(socket.user, 'approve_daily_special')) {
      return;
    }

    // Notifier tout le restaurant
    this.io.to(`restaurant:${restaurantId}`).emit('daily-special-rejected', {
      special: data.special,
      rejectedBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      reason: data.reason,
      timestamp: new Date()
    });

    // Notifier spécifiquement le créateur
    if (data.special.createdBy && data.special.createdBy !== socket.userId) {
      this.notifyUser(data.special.createdBy, 'your-daily-special-rejected', {
        special: data.special,
        rejectedBy: socket.user,
        reason: data.reason
      });
    }

    logger.info(`Plat du jour rejeté via WebSocket: ${data.special?.name} par ${socket.user.firstName}`);
  }

  /**
   * Commande créée
   */
  handleOrderCreated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    // Notifier la cuisine et les managers
    this.notifyByRole(restaurantId, ['manager', 'owner', 'admin'], 'new-order', {
      order: data.order,
      createdBy: socket.user
    });

    // Notifier tous les utilisateurs
    this.io.to(`restaurant:${restaurantId}`).emit('order-created', {
      order: data.order,
      createdBy: socket.user,
      timestamp: new Date()
    });
  }

  /**
   * Statut de commande mis à jour
   */
  handleOrderStatusUpdated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    this.io.to(`restaurant:${restaurantId}`).emit('order-status-updated', {
      orderId: data.orderId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      updatedBy: socket.user,
      timestamp: new Date()
    });
  }

  /**
   * Statut de table mis à jour
   */
  handleTableStatusUpdated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    this.io.to(`restaurant:${restaurantId}`).emit('table-status-updated', {
      tableId: data.tableId,
      floorPlanId: data.floorPlanId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      updatedBy: socket.user,
      timestamp: new Date()
    });
  }

  /**
   * Réservation créée
   */
  handleReservationCreated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    this.io.to(`restaurant:${restaurantId}`).emit('reservation-created', {
      reservation: data.reservation,
      createdBy: socket.user,
      timestamp: new Date()
    });
  }

  /**
   * Réservation mise à jour
   */
  handleReservationUpdated(socket, data) {
    const restaurantId = socket.restaurantId;
    
    this.io.to(`restaurant:${restaurantId}`).emit('reservation-updated', {
      reservation: data.reservation,
      changes: data.changes,
      updatedBy: socket.user,
      timestamp: new Date()
    });
  }

  /**
   * Utilisateur en train de taper
   */
  handleUserTyping(socket, data) {
    const restaurantId = socket.restaurantId;
    
    socket.to(`restaurant:${restaurantId}`).emit('user-typing', {
      userId: socket.userId,
      user: {
        firstName: socket.user.firstName,
        lastName: socket.user.lastName
      },
      context: data.context
    });
  }

  /**
   * Utilisateur a arrêté de taper
   */
  handleUserStoppedTyping(socket, data) {
    const restaurantId = socket.restaurantId;
    
    socket.to(`restaurant:${restaurantId}`).emit('user-stopped-typing', {
      userId: socket.userId,
      context: data.context
    });
  }

  /**
   * Méthodes utilitaires publiques pour émettre des événements
   */

  /**
   * Notifier tous les utilisateurs d'un restaurant
   */
  notifyRestaurant(restaurantId, event, data) {
    if (this.io) {
      this.io.to(`restaurant:${restaurantId}`).emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Notifier les utilisateurs par rôle
   */
  notifyByRole(restaurantId, roles, event, data) {
    if (!this.io) return;

    // Trouver tous les sockets du restaurant avec les rôles spécifiés
    const room = this.io.sockets.adapter.rooms.get(`restaurant:${restaurantId}`);
    if (!room) return;

    room.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.user && roles.includes(socket.user.role)) {
        socket.emit(event, {
          ...data,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Notifier un utilisateur spécifique
   */
  notifyUser(userId, event, data) {
    const userConnection = this.connectedUsers.get(userId.toString());
    if (userConnection && this.io) {
      this.io.to(userConnection.socketId).emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Diffuser un événement à tous les clients connectés
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Obtenir les utilisateurs connectés pour un restaurant
   */
  getConnectedUsersForRestaurant(restaurantId) {
    const users = [];
    
    if (this.io && restaurantId) {
      const room = this.io.sockets.adapter.rooms.get(`restaurant:${restaurantId}`);
      if (room) {
        room.forEach(socketId => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket && socket.user) {
            users.push({
              id: socket.user._id,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName,
              role: socket.user.role,
              connectedAt: this.connectedUsers.get(socket.userId)?.connectedAt
            });
          }
        });
      }
    }
    
    return users;
  }

  /**
   * Vérifier les permissions d'un utilisateur
   */
  hasPermission(user, permission) {
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions.includes(permission);
  }

  /**
   * Obtenir les statistiques de connexion
   */
  getConnectionStats() {
    return {
      totalConnectedUsers: this.connectedUsers.size,
      restaurantsWithUsers: this.restaurantRooms.size,
      connectionsByRestaurant: Array.from(this.restaurantRooms.entries()).map(([restaurantId, sockets]) => ({
        restaurantId,
        connectedUsers: sockets.size
      }))
    };
  }
}

// Singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;