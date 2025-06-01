const mongoose = require('mongoose');

// Schéma pour une table
const tableSchema = new mongoose.Schema({ // CORRIGÉ: était "monggose"
    number: {
        type: String,
        required: [true, 'Le numéro de table est requis'],
        trim: true
    },
    capacity: {
        type: Number,
        required: [true, 'La capacité de table est requise'],
        min: [1, 'La capacité doit être d\'au moins 1 personne'],
        max: [20, 'La capacité ne peut dépasser 20 personnes']
    },
    shape: {
        type: String,
        required: [true, 'La forme est requise'],
        enum: {
            values: ['round', 'square', 'rectangle', 'oval'],
            message: 'La forme doit être : round, square, rectangle ou oval'
        },
        default: 'round'
    },
    position: {
        x: {
            type: Number,
            required: [true, 'La position X est requise'],
            min: 0
        },
        y: {
            type: Number,
            required: [true, 'La position Y est requise'],
            min: 0
        }
    },
    rotation: {
        type: Number,
        default: 0,
        min: 0,
        max: 360,
        validate: {
            validator: function (v) {
                return v >= 0 && v <= 360;
            },
            message: 'La rotation doit être entre 0 et 360°'
        }
    },
    dimensions: {
        width: {
            type: Number,
            required: [true, 'Largeur requise'],
            min: [20, 'Largeur minimum : 20cm']
        },
        height: {
            type: Number,
            required: [true, 'Longueur requise'],
            min: [20, 'Longueur minimum : 20cm']
        }
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'cleaning', 'out_of_order'], // CORRIGÉ: uniformisé avec "available" au lieu de "free"
        default: 'available'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    _id: true
});

// Schéma pour un obstacle (mur, colonne, bar...)
const obstacleSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, 'Le type d\'obstacle est requis'],
        enum: {
            values: ['wall', 'column', 'bar', 'kitchen_door', 'entrance', 'window', 'stairs', 'door', 'decoration', 'other'], // AJOUTÉ decoration
            message: 'Type d\'obstacle invalide'
        }
    },
    name: {
        type: String,
        trim: true,
        maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
    },
    position: {
        x: {
            type: Number,
            required: [true, 'La position X est requise'],
            min: 0
        },
        y: {
            type: Number,
            required: [true, 'La position Y est requise'],
            min: 0
        }
    },
    dimensions: {
        width: {
            type: Number,
            required: [true, 'La largeur est requise'],
            min: [1, 'La largeur minimum est 1cm']
        },
        height: {
            type: Number,
            required: [true, 'La hauteur est requise'],
            min: [1, 'La hauteur minimum est 1cm']
        }
    },
    rotation: {
        type: Number,
        default: 0,
        min: 0,
        max: 360
    },
    color: {
        type: String,
        default: '#808080',
        match: [/^#[0-9A-F]{6}$/i, 'Format de couleur invalide (ex: #FF0000)']
    },
    isWalkable: {
        type: Boolean,
        default: false
    }
}, {
    _id: true
});

// Schéma principal pour le plan de salle
const floorPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom du plan de salle est requis'],
        trim: true,
        maxlength: [100, 'Le nom ne peut dépasser 100 caractères']
    },
    description: {
        type: String,
        maxlength: [500, 'La description ne peut dépasser 500 caractères']
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'L\'ID du restaurant est requis']
    },
    dimensions: {
        width: {
            type: Number,
            required: [true, 'La largeur du plan est requise'],
            min: [100, 'La largeur minimum est 100cm']
        },
        height: {
            type: Number,
            required: [true, 'La hauteur du plan est requise'],
            min: [100, 'La hauteur minimum est 100cm']
        },
        unit: {
            type: String,
            enum: ['cm', 'm', 'px'],
            default: 'cm'
        }
    },
    
    tables: [tableSchema],
    obstacles: [obstacleSchema],
    
    settings: {
        backgroundColor: {
            type: String,
            default: '#FFFFFF',
            match: [/^#[0-9A-F]{6}$/i, 'Format de couleur invalide']
        },
        gridSize: {
            type: Number,
            default: 10,
            min: [1, 'La taille de grille minimum est 1']
        },
        showGrid: {
            type: Boolean,
            default: true
        },
        snapToGrid: {
            type: Boolean,
            default: true
        }
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    isDefault: {
        type: Boolean,
        default: false
    },
    
    version: {
        type: Number,
        default: 1
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index pour améliorer les performances
floorPlanSchema.index({ restaurantId: 1 });
floorPlanSchema.index({ restaurantId: 1, isDefault: 1 });
floorPlanSchema.index({ restaurantId: 1, isActive: 1 });
floorPlanSchema.index({ createdBy: 1 }); // CORRIGÉ: était "restaurantId: 1" en double

// Middleware pour vérifier qu'il n'y a qu'un seul plan par défaut par restaurant
floorPlanSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Retirer le statut défaut des autres plans du même restaurant
        await this.constructor.updateMany(
            {
                restaurantId: this.restaurantId,
                _id: { $ne: this._id },
                isDefault: true
            },
            { isDefault: false }
        );
    }
    next();
});

// Virtuel pour obtenir le nombre total de places
floorPlanSchema.virtual('totalCapacity').get(function() {
    return this.tables.reduce((total, table) => {
        return table.isActive ? total + table.capacity : total;
    }, 0);
});

// Virtuel pour obtenir le nombre de tables actives
floorPlanSchema.virtual('activeTablesCount').get(function() {
    return this.tables.filter(table => table.isActive).length;
});

// Méthode pour valider qu'il n'y a pas de collision entre tables
floorPlanSchema.methods.validateTablePositions = function() {
    const activeTables = this.tables.filter(table => table.isActive);
    
    for (let i = 0; i < activeTables.length; i++) {
        for (let j = i + 1; j < activeTables.length; j++) {
            const table1 = activeTables[i];
            const table2 = activeTables[j];
            
            // Vérifier la collision
            const distance = Math.sqrt(
                Math.pow(table1.position.x - table2.position.x, 2) +
                Math.pow(table1.position.y - table2.position.y, 2)
            );
            
            const minDistance = (table1.dimensions.width + table2.dimensions.width) / 2 + 30; // 30cm d'espace minimum
            
            if (distance < minDistance) {
                throw new Error(`Les tables ${table1.number} et ${table2.number} sont trop proches`);
            }
        }
    }
};

// Méthode pour obtenir une table par son numéro
floorPlanSchema.methods.getTableByNumber = function(tableNumber) {
    return this.tables.find(table => table.number === tableNumber && table.isActive);
};

// Méthode pour MAJ le statut d'une table
floorPlanSchema.methods.updateTableStatus = function(tableNumber, status) {
    const table = this.getTableByNumber(tableNumber);
    if (table) {
        table.status = status;
        return table;
    }
    throw new Error(`Table ${tableNumber} non trouvée`);
};

// Méthode pour obtenir les infos publiques
floorPlanSchema.methods.toPublicJSON = function() {
    const floorPlan = this.toObject({ virtuals: true });
    delete floorPlan.__v;
    return floorPlan;
};

// Validation personnalisée pour vérifier que les numéros de tables sont uniques
floorPlanSchema.path('tables').validate(function(tables) {
    const activeTableNumbers = tables
        .filter(table => table.isActive)
        .map(table => table.number);
    
    const uniqueNumbers = [...new Set(activeTableNumbers)];
    return uniqueNumbers.length === activeTableNumbers.length;
}, 'Les numéros de table doivent être uniques');

module.exports = mongoose.model('FloorPlan', floorPlanSchema);