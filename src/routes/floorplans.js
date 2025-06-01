const express = require('express');
const FloorPlan = require('../models/FloorPlan');
const { auth } = require('../middleware/auth');
const { requireRole, requireSameRestaurant, requireManagement } = require('../middleware/roleCheck'); // Corrigé le chemin
const { USER_ROLES } = require('../utils/constants');
const {
  validateCreateFloorPlan,
  validateUpdateFloorPlan,
  validateTableStatus,
  validateGeometry
} = require('../middleware/tableValidation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// GET /api/floor-plans => obtenir tous les plans de salle (par restaurant)
router.get('/', requireSameRestaurant, async (req, res) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;

        const filter = {};

        // Filtrer par restaurant
        if (req.user.role !== USER_ROLES.ADMIN) {
            filter.restaurantId = req.user.restaurantId;
        } else if (req.query.restaurantId) {
            filter.restaurantId = req.query.restaurantId;
        }

        // Filtres optionnels
        if (isActive !== undefined) filter.isActive = isActive === 'true'; // Corrigé la faute de frappe

        const floorPlans = await FloorPlan.find(filter)
            .populate('restaurantId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ isDefault: -1, createdAt: -1 });

        const total = await FloorPlan.countDocuments(filter);

        res.json({
            success: true,
            data: {
                floorPlans: floorPlans.map(fp => fp.toPublicJSON()),
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des plans de salle:', error); // Corrigé la faute de frappe
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// GET /api/floor-plans/default => Obtenir le plan de salle par défaut
router.get('/default', requireSameRestaurant, async (req, res) => {
    try {
        const filter = { isDefault: true, isActive: true };

        if (req.user.role !== USER_ROLES.ADMIN) {
            filter.restaurantId = req.user.restaurantId;
        } else if (req.query.restaurantId) { // Corrigé la faute de frappe
            filter.restaurantId = req.query.restaurantId;
        }

        const defaultFloorPlan = await FloorPlan.findOne(filter)
            .populate('restaurantId', 'name')
            .populate('createdBy', 'firstName lastName');

        if (!defaultFloorPlan) {
            return res.status(404).json({
                success: false, // Corrigé la faute de frappe
                message: 'Aucun plan de salle par défaut trouvé'
            });
        }

        res.json({
            success: true,
            data: { floorPlan: defaultFloorPlan.toPublicJSON() }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du plan par défaut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// Middleware de deboggage
router.use('/:id', (req, res, next) => {
  console.log('🔍 DEBUG MIDDLEWARE - Route /:id', {
    method: req.method,
    params: req.params,
    userRole: req.user?.role,
    userRestaurantId: req.user?.restaurantId?.toString(),
    userId: req.user?._id?.toString()
  });
  next();
});

// GET /api/floor-plans/:id => Obtenir un plan de salle spécifique
router.get('/:id', requireSameRestaurant, async (req, res) => {
    try {
        console.log('🎯 DEBUG GET /:id - Début de la route');
        
        const floorPlan = await FloorPlan.findById(req.params.id)
            .populate('restaurantId', 'name')
            .populate('createdBy', 'firstName lastName')
            .populate('lastModifiedBy', 'firstName lastName');

        console.log('📋 DEBUG FloorPlan trouvé:', {
            found: !!floorPlan,
            id: floorPlan?._id?.toString(),
            restaurantId: floorPlan?.restaurantId?._id?.toString(),
            restaurantName: floorPlan?.restaurantId?.name
        });

        if (!floorPlan) {
            console.log('❌ Plan de salle non trouvé');
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions d'accès avec debugging détaillé
        const isAdmin = req.user.role === USER_ROLES.ADMIN;
        const userRestaurantId = req.user.restaurantId?._id?.toString();
        const floorPlanRestaurantId = floorPlan.restaurantId._id?.toString();
        const hasAccess = isAdmin || (userRestaurantId === floorPlanRestaurantId);

        console.log('🔐 DEBUG Vérification permissions:', {
            isAdmin,
            userRestaurantId,
            floorPlanRestaurantId,
            hasAccess,
            userRole: req.user.role
        });

        if (!hasAccess) {
            console.log('❌ Accès refusé - 403');
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à ce plan de salle',
                debug: {
                    userRestaurantId,
                    floorPlanRestaurantId,
                    userRole: req.user.role
                }
            });
        }

        console.log('✅ Accès autorisé, retour des données');
        res.json({
            success: true,
            data: { floorPlan: floorPlan.toPublicJSON() }
        });
    } catch (error) {
        console.error('💥 Erreur dans GET /:id:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});


// Routes de débogage temporaires

router.get('/debug/user-info', auth, (req, res) => {
  res.json({
    success: true,
    debug: {
      userId: req.user._id,
      userRole: req.user.role,
      userRestaurantId: req.user.restaurantId,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`
    }
  });
});

router.get('/debug/plan-info/:id', auth, async (req, res) => {
  try {
    const floorPlan = await FloorPlan.findById(req.params.id)
      .populate('restaurantId', 'name')
      .populate('createdBy', 'firstName lastName');
    
    if (!floorPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan non trouvé'
      });
    }
    
    res.json({
      success: true,
      debug: {
        planId: floorPlan._id,
        planName: floorPlan.name,
        restaurantId: floorPlan.restaurantId._id,
        restaurantName: floorPlan.restaurantId.name,
        createdBy: floorPlan.createdBy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



// POST /api/floor-plans => Créer un nouveau plan de salle
router.post('/', requireManagement, validateCreateFloorPlan, validateGeometry, async (req, res) => {
    try {
        // Assigner automatiquement le restaurant si pas admin
        if (req.user.role !== USER_ROLES.ADMIN) {
            req.body.restaurantId = req.user.restaurantId;
        }

        // Assigner le créateur
        req.body.createdBy = req.user._id;

        const floorPlan = new FloorPlan(req.body);

        // Valider les positions des tables
        if (floorPlan.tables && floorPlan.tables.length > 0) {
            floorPlan.validateTablePositions();
        }

        await floorPlan.save();

        await floorPlan.populate([
            { path: 'restaurantId', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Plan de salle créé avec succès',
            data: { floorPlan: floorPlan.toPublicJSON() }
        });

    } catch (error) {
        console.error('Erreur lors de la création du plan de salle:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message); // Corrigé la faute de frappe
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation',
                errors
            });
        }

        res.status(400).json({
            success: false,
            message: error.message || 'Erreur lors de la création'
        });
    }
});

// PUT /api/floor-plans/:id => MAJ un plan de salle
router.put('/:id', requireManagement, validateUpdateFloorPlan, validateGeometry, async (req, res) => {
    try {
        const floorPlan = await FloorPlan.findById(req.params.id);

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions de modification
        if (req.user.role !== USER_ROLES.ADMIN && // Corrigé la faute de frappe
            req.user.restaurantId?._id?.toString() !== floorPlan.restaurantId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes pour modifier ce plan de salle'
            });
        }

        // Interdire la modification du restaurant
        delete req.body.restaurantId;
        delete req.body.createdBy;

        // MAJ le modificateur
        req.body.lastModifiedBy = req.user._id;

        // Incrémenter la version
        if (req.body.tables || req.body.obstacles) { // Corrigé la faute de frappe
            req.body.version = (floorPlan.version || 1) + 1;
        }

        // Appliquer les modifications
        Object.assign(floorPlan, req.body);

        // Valider les positions des tables si modifiées
        if (req.body.tables) {
            floorPlan.validateTablePositions();
        }

        await floorPlan.save();

        await floorPlan.populate([
            { path: 'restaurantId', select: 'name' },
            { path: 'createdBy', select: 'firstName lastName' },
            { path: 'lastModifiedBy', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            message: 'Plan de salle mis à jour avec succès',
            data: { floorPlan: floorPlan.toPublicJSON() }
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Erreur lors de la mise à jour'
        });
    }
});

// PATCH /api/floor-plans/:id/default => Définir comme plan par défaut
router.patch('/:id/default', requireManagement, async (req, res) => {
    try {
        const floorPlan = await FloorPlan.findById(req.params.id);

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions 
        if (req.user.role !== USER_ROLES.ADMIN &&
            req.user.restaurantId?._id?.toString() !== floorPlan.restaurantId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes'
            });
        }

        floorPlan.isDefault = true;
        await floorPlan.save();

        res.json({
            success: true,
            message: 'Plan de salle défini comme par défaut',
            data: { floorPlan: floorPlan.toPublicJSON() }
        });
    } catch (error) {
        console.error('Erreur lors de la définition par défaut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// PATCH /api/floor-plans/:id/tables/:tableId/status => MAJ le statut d'une table
router.patch('/:id/tables/:tableId/status', validateTableStatus, async (req, res) => { // Corrigé le nom du paramètre et ajouté validation
    try {
        const { status } = req.body;

        const floorPlan = await FloorPlan.findById(req.params.id);

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.role !== USER_ROLES.ADMIN &&
            req.user.restaurantId?._id?.toString() !== floorPlan.restaurantId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes'
            });
        }

        const table = floorPlan.tables.id(req.params.tableId);

        if (!table) {
            return res.status(404).json({
                success: false,
                message: 'Table non trouvée'
            });
        }

        table.status = status;
        await floorPlan.save();

        res.json({
            success: true,
            message: 'Statut de la table mis à jour',
            data: {
                table: {
                    id: table._id,
                    number: table.number,
                    status: table.status
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// DELETE /api/floor-plans/:id => Supprimer un plan de salle
router.delete('/:id', requireManagement, async (req, res) => {
    try {
        const floorPlan = await FloorPlan.findById(req.params.id);

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.role !== USER_ROLES.ADMIN &&
            req.user.restaurantId?._id?.toString() !== floorPlan.restaurantId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes'
            });
        }

        // Empêcher la suppression du plan par défaut s'il y en a d'autres
        if (floorPlan.isDefault) {
            const otherPlans = await FloorPlan.countDocuments({
                restaurantId: floorPlan.restaurantId, // Corrigé la faute de frappe
                _id: { $ne: floorPlan._id },
                isActive: true
            });

            if (otherPlans > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de supprimer le plan par défaut. Définissez un autre plan comme défaut d\'abord.'
                });
            }
        }

        // Soft delete
        floorPlan.isActive = false;
        await floorPlan.save();

        res.json({
            success: true, // Corrigé la faute de frappe
            message: 'Plan de salle désactivé avec succès' // Corrigé la faute de frappe
        });
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

// GET /api/floor-plans/:id/export => Exporter un plan de salle (pour sauvegarde/import)
router.get('/:id/export', requireManagement, async (req, res) => {
    try {
        const floorPlan = await FloorPlan.findById(req.params.id)
            .select('-createdBy -lastModifiedBy -createdAt -updatedAt -__v');

        if (!floorPlan) {
            return res.status(404).json({
                success: false,
                message: 'Plan de salle non trouvé'
            });
        }

        // Vérifier les permissions
        if (req.user.role !== USER_ROLES.ADMIN &&
            req.user.restaurantId?._id?.toString() !== floorPlan.restaurantId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Permissions insuffisantes'
            });
        }

        const exportData = {
            ...floorPlan.toObject(),
            exportDate: new Date().toISOString(),
            exportedBy: {
                id: req.user._id,
                name: `${req.user.firstName} ${req.user.lastName}`
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="floorplan-${floorPlan.name}-${Date.now()}.json"`);

        res.json({
            success: true,
            data: exportData
        });

    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
});

module.exports = router;