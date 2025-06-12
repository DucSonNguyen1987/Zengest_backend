# 📚 Documentation Complète du Backend Zengest

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture Technique](#architecture-technique)
3. [Installation et Configuration](#installation-et-configuration)
4. [API Reference Complète](#api-reference-complète)
5. [Modèles de Données Détaillés](#modèles-de-données-détaillés)
6. [Système d'Authentification](#système-dauthentification)
7. [Gestion des Permissions](#gestion-des-permissions)
8. [Fonctionnalités Avancées](#fonctionnalités-avancées)
9. [Scripts et Outils](#scripts-et-outils)
10. [Tests et Validation](#tests-et-validation)
11. [Déploiement et Production](#déploiement-et-production)
12. [Maintenance et Monitoring](#maintenance-et-monitoring)
13. [Dépannage et FAQ](#dépannage-et-faq)

---

## 🎯 Vue d'ensemble

### Description
**Zengest Backend** est une API RESTful complète pour la gestion de restaurants, développée avec Node.js, Express et MongoDB. Elle offre un écosystème complet pour gérer tous les aspects d'un restaurant moderne.

### Informations Clés
- **Version** : 1.2.0
- **Node.js** : ≥18.0.0 (obligatoire pour fetch natif)
- **Base de données** : MongoDB avec Mongoose ODM
- **Architecture** : API RESTful avec JWT
- **Sécurité** : Helmet, CORS, Rate limiting
- **Temps réel** : Support WebSocket prévu

### Fonctionnalités Principales

#### 🔐 Authentification & Autorisation
- JWT avec expiration configurable (24h par défaut)
- Système de rôles hiérarchiques (Admin → Owner → Manager → Staff)
- Middleware de permissions granulaires
- Rate limiting spécialisé pour l'authentification

#### 🏢 Gestion Multi-Restaurant
- Support multi-tenant avec isolation des données
- Création automatique de restaurant pour les owners
- Statut temps réel des restaurants (ouvert/fermé)
- Gestion des horaires complexes

#### 👥 Gestion Utilisateurs Avancée
- Rôles en minuscules (staff_floor, staff_bar, staff_kitchen)
- RestaurantId optionnel pour flexibilité des tests
- Pagination intelligente sur tous les endpoints
- Validation robuste avec messages d'erreur détaillés

#### 📋 Système de Commandes Intelligent
- FloorPlanId automatique (utilise le plan par défaut si non spécifié)
- Formats clients flexibles (name simple ou firstName/lastName)
- États multiples avec timestamps précis
- Calculs automatiques de prix avec taxes et remises

#### 📅 Réservations avec Notifications
- Formats clients adaptatifs avec normalisation automatique
- Assignment automatique de tables selon capacité
- Notifications email automatisées (confirmations, rappels)
- Gestion des no-shows avec alertes

#### 🗺️ Plans de Salle Interactifs
- Éditeur drag-drop avec formes personnalisables
- États des tables en temps réel
- Gestion des obstacles et zones spéciales
- Export/import des configurations

#### 🍽️ Menu Dynamique
- Variantes de prix multiples par élément
- Gestion des allergènes et restrictions alimentaires
- Disponibilité par créneaux horaires
- Système d'inventaire intégré

#### 📊 Analytics et Rapports
- Statistiques en temps réel
- Rapports de performance
- Analyse des tendances
- Métriques de satisfaction client

---

## 🏗️ Architecture Technique

### Stack Technologique

```
Frontend (Web/Mobile)
         ↕ HTTPS/REST
┌─────────────────────────────┐
│      Express.js API         │
├─────────────────────────────┤
│  • Helmet (Sécurité)       │
│  • CORS (Multi-origine)    │
│  • Rate Limiting           │
│  • Compression             │
│  • Morgan (Logs)           │
└─────────────────────────────┘
         ↕ Mongoose ODM
┌─────────────────────────────┐
│       MongoDB Atlas         │
│  • Collections relationnelles│
│  • Index optimisés         │
│  • Transactions ACID       │
└─────────────────────────────┘
         ↕ SMTP
┌─────────────────────────────┐
│    Services Externes        │
│  • Brevo (Email)           │
│  • Nodemailer              │
│  • Node-cron (Tâches)      │
└─────────────────────────────┘
```

### Structure des Dossiers

```
zengest-backend/
├── 📄 Configuration
│   ├── package.json          # Dépendances et scripts
│   ├── app.js               # Configuration Express
│   ├── server.js            # Point d'entrée principal
│   ├── .env                 # Variables d'environnement
│   ├── .env.example         # Template de configuration
│   └── nodemon.json         # Configuration développement
│
├── 📁 src/
│   ├── 📁 config/           # Configuration système
│   │   ├── config.js        # Configuration générale
│   │   ├── database.js      # Connexion MongoDB
│   │   └── email.js         # Configuration email
│   │
│   ├── 📁 models/           # Modèles Mongoose
│   │   ├── User.js          # Utilisateurs et authentification
│   │   ├── Restaurant.js    # Données restaurant
│   │   ├── FloorPlan.js     # Plans de salle
│   │   ├── Menu.js          # Éléments du menu
│   │   ├── Order.js         # Commandes
│   │   └── Reservation.js   # Réservations
│   │
│   ├── 📁 controllers/      # Logique métier
│   │   ├── authController.js      # Authentification
│   │   ├── userController.js      # Gestion utilisateurs
│   │   ├── restaurantController.js # Gestion restaurants
│   │   ├── orderController.js     # Gestion commandes
│   │   ├── menuController.js      # Gestion menu
│   │   ├── reservationController.js # Gestion réservations
│   │   └── notificationController.js # Notifications
│   │
│   ├── 📁 routes/           # Définition des routes
│   │   ├── auth.js          # Routes authentification
│   │   ├── users.js         # Routes utilisateurs
│   │   ├── restaurants.js   # Routes restaurants
│   │   ├── orders.js        # Routes commandes
│   │   ├── menu.js          # Routes menu
│   │   ├── reservations.js  # Routes réservations
│   │   ├── floorplans.js    # Routes plans de salle
│   │   └── notifications.js # Routes notifications
│   │
│   ├── 📁 middleware/       # Middlewares personnalisés
│   │   ├── auth.js          # Authentification JWT
│   │   ├── roleCheck.js     # Vérification des rôles
│   │   ├── validation.js    # Validation des données
│   │   └── errorHandler.js  # Gestion globale des erreurs
│   │
│   ├── 📁 utils/            # Utilitaires
│   │   ├── constants.js     # Constantes système
│   │   ├── pagination.js    # Système de pagination
│   │   ├── emailTemplates.js # Templates d'emails
│   │   └── reservationScheduler.js # Tâches automatisées
│   │
│   ├── 📁 scripts/          # Scripts de maintenance
│   │   ├── seedData.js      # Données d'initialisation
│   │   ├── seedMenu.js      # Menu de démonstration
│   │   ├── seedOrders.js    # Commandes de test
│   │   └── backup.js        # Sauvegarde automatique
│   │
│   └── 📁 tests/            # Tests automatisés
│       ├── auth.test.js     # Tests authentification
│       ├── orders.test.js   # Tests commandes
│       ├── menu.test.js     # Tests menu
│       └── integration.test.js # Tests d'intégration
│
├── 📁 logs/                 # Fichiers de logs
├── 📁 uploads/              # Fichiers uploadés
├── 📁 public/               # Fichiers statiques
└── 📁 docs/                 # Documentation additionnelle
```

### Flux de Données

```mermaid
graph TD
    A[Client Request] --> B[Express Router]
    B --> C[CORS & Security Headers]
    C --> D[Rate Limiting]
    D --> E[Body Parsing]
    E --> F[Authentication Middleware]
    F --> G[Route Handler]
    G --> H[Controller Logic]
    H --> I[Data Validation]
    I --> J[Database Operation]
    J --> K[Response Formatting]
    K --> L[Client Response]
    
    F --> M[JWT Verification]
    M --> N[User Permissions Check]
    N --> G
    
    H --> O[Business Logic]
    O --> P[Related Data Population]
    P --> J
```

---

## 🛠️ Installation et Configuration

### Prérequis Système

```bash
# Versions minimales requises
Node.js: ≥18.0.0 (pour fetch natif)
npm: ≥8.0.0
MongoDB: ≥5.0 (ou MongoDB Atlas)
RAM: ≥2GB recommandés
Stockage: ≥1GB libre
```

### Installation Complète

```bash
# 1. Cloner le repository
git clone https://github.com/zengest/backend.git
cd zengest-backend

# 2. Installer les dépendances
npm install

# 3. Configuration environnement
cp .env.example .env

# 4. Éditer le fichier .env
nano .env
```

### Configuration .env Détaillée

```env
# === BASE DE DONNÉES ===
MONGODB_URI=mongodb://localhost:27017/zengest
# Ou MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/zengest

# === AUTHENTIFICATION ===
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
JWT_EXPIRE=24h
BCRYPT_ROUNDS=12

# === SERVEUR ===
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# === EMAIL (Configuration Brevo recommandée) ===
EMAIL_SERVICE=brevo
EMAIL_USER=votre.email@domaine.com
EMAIL_PASSWORD=votre_cle_smtp_brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false

# Alternatives Gmail
# EMAIL_SERVICE=gmail
# EMAIL_USER=votre.email@gmail.com
# EMAIL_PASSWORD=votre_app_password_16_caracteres

# === FONCTIONNALITÉS AVANCÉES ===
ENABLE_CRON_JOBS=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=200

# === STOCKAGE ===
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10mb
ALLOWED_EXTENSIONS=jpg,jpeg,png,pdf

# === SÉCURITÉ ===
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
SESSION_SECRET=your_session_secret
HELMET_CSP=default-src 'self'

# === LOGS ===
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_ROTATION_DAYS=30

# === DÉVELOPPEMENT ===
DEBUG_MODE=true
MOCK_EMAIL=false
SEED_DATA_ON_START=false
```

### Scripts d'Initialisation

```bash
# Initialisation complète
npm run seed:complete    # Données complètes (restaurant + utilisateurs + menu)

# Initialisation par parties
npm run seed            # Utilisateurs de base uniquement
npm run seed:menu       # Menu de démonstration
npm run seed:orders     # Commandes de test
npm run seed:reservations # Réservations d'exemple

# Nettoyage et réinitialisation
npm run seed:clean      # Vider toute la base
npm run seed:reset      # Nettoyer puis réinitialiser

# Données en direct (avec vraies dates)
npm run seed:reservations:live
```

### Démarrage du Serveur

```bash
# Développement (avec hot-reload)
npm run dev             # Node.js natif --watch
npm run dev:legacy      # Nodemon pour compatibilité
npm run dev:debug       # Avec debugger Node.js

# Production
npm start

# Tests avant démarrage
npm run validate        # Lint + tests
npm run health          # Vérification santé API
```

---

## 🔌 API Reference Complète

### Base URL et Headers

```
Base URL: http://localhost:3000/api
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Authentification

#### POST /auth/login
Connexion utilisateur avec email et mot de passe.

**Request Body:**
```json
{
  "email": "admin@zengest.com",
  "password": "Admin123!"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "Admin",
      "lastName": "Système",
      "email": "admin@zengest.com",
      "role": "admin",
      "restaurantId": {
        "id": "restaurant_id",
        "name": "Le Bistrot de Zengest"
      },
      "isActive": true,
      "lastLogin": "2025-06-06T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h",
    "permissions": [
      "users:read", "users:write", "users:delete",
      "restaurants:read", "restaurants:write",
      "orders:read", "orders:write"
    ]
  }
}
```

#### GET /auth/me
Récupérer le profil de l'utilisateur connecté.

**Headers:** `Authorization: Bearer <token>`

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "Admin",
      "lastName": "Système",
      "email": "admin@zengest.com",
      "role": "admin",
      "permissions": ["users:read", "users:write"],
      "restaurantId": {
        "id": "restaurant_id",
        "name": "Le Bistrot de Zengest",
        "isActive": true
      }
    }
  }
}
```

#### PUT /auth/change-password
Changer le mot de passe de l'utilisateur connecté.

**Request Body:**
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe",
  "confirmPassword": "nouveau_mot_de_passe"
}
```

### Gestion des Utilisateurs

#### GET /users
Liste paginée des utilisateurs avec filtres.

**Query Parameters:**
- `page` (number): Page courante (défaut: 1)
- `limit` (number): Éléments par page (défaut: 10, max: 100)
- `role` (string): Filtrer par rôle
- `search` (string): Recherche textuelle (nom, email)
- `restaurantId` (string): Filtrer par restaurant (admin uniquement)
- `isActive` (boolean): Filtrer par statut actif

**Example Request:**
```bash
GET /api/users?page=1&limit=10&role=staff_floor&search=sophie
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "firstName": "Sophie",
        "lastName": "Bernard",
        "email": "sophie.salle@bistrot-zengest.com",
        "role": "staff_floor",
        "phone": "+33123456789",
        "isActive": true,
        "restaurantId": {
          "id": "restaurant_id",
          "name": "Le Bistrot de Zengest"
        },
        "createdAt": "2025-06-01T10:00:00.000Z",
        "lastLogin": "2025-06-06T09:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "total": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### POST /users
Créer un nouvel utilisateur.

**Permissions requises:** Admin ou Owner

**Request Body:**
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@restaurant.com",
  "password": "MotDePasse123!",
  "role": "staff_floor",
  "phone": "+33123456789",
  "restaurantId": "restaurant_id" // Optionnel si owner
}
```

#### PUT /users/:id
Modifier un utilisateur existant.

**Request Body:** (tous les champs optionnels)
```json
{
  "firstName": "Jean Updated",
  "lastName": "Dupont",
  "phone": "+33987654321",
  "isActive": false
}
```

### Gestion des Restaurants

#### GET /restaurants
Liste des restaurants (Admin uniquement).

#### GET /restaurants/:id
Détails d'un restaurant spécifique.

#### GET /restaurants/:id/status
Statut en temps réel du restaurant.

**Response:**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": "restaurant_id",
      "name": "Le Bistrot de Zengest",
      "isActive": true,
      "isOpenNow": true,
      "currentDay": "friday",
      "currentTime": "14:30",
      "todayHours": {
        "open": "08:00",
        "close": "02:00",
        "closed": false
      },
      "capacity": {
        "seatingCapacity": 60,
        "tablesCount": 15
      }
    }
  }
}
```

### Système de Commandes

#### GET /orders
Liste paginée des commandes avec filtres avancés.

**Query Parameters:**
- `status` (string): pending, confirmed, preparing, ready, served, paid, cancelled
- `tableNumber` (string): Filtrer par numéro de table
- `dateFrom` / `dateTo` (ISO date): Période
- `assignedServer` (string): ID du serveur assigné
- `priority` (string): normal, urgent
- `sortBy` (string): Champ de tri (défaut: timestamps.ordered)
- `sortOrder` (string): asc, desc

#### POST /orders
Créer une nouvelle commande avec gestion automatique du plan de salle.

**Request Body:**
```json
{
  "tableNumber": "5",
  "floorPlanId": "plan_id", // Optionnel - utilisera le plan par défaut si absent
  "customer": {
    "name": "Jean Dupont", // Format simple - sera splitté automatiquement
    // OU
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+33123456789",
    "email": "jean@example.com",
    "notes": "Allergique aux fruits de mer"
  },
  "items": [
    {
      "menuItem": "menu_item_id",
      "quantity": 2,
      "price": 15.50,
      "variants": {
        "size": "portion",
        "customizations": ["sans fromage", "sauce à part"]
      },
      "notes": "Bien cuit"
    }
  ],
  "priority": "normal",
  "notes": "Table près de la fenêtre"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "Commande créée avec succès",
  "data": {
    "order": {
      "id": "order_id",
      "orderNumber": "ORD-2025-001234",
      "status": "pending",
      "tableNumber": "5",
      "floorPlanId": "plan_id",
      "customer": {
        "firstName": "Jean",
        "lastName": "Dupont",
        "phone": "+33123456789",
        "name": "Jean Dupont" // Généré automatiquement
      },
      "items": [...],
      "pricing": {
        "subtotal": 31.00,
        "tax": 6.20,
        "total": 37.20
      },
      "timestamps": {
        "ordered": "2025-06-06T14:30:00.000Z"
      }
    }
  }
}
```

#### PATCH /orders/:id/status
Changer le statut d'une commande.

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Préparation commencée"
}
```

### Système de Réservations

#### POST /reservations
Créer une réservation avec formats clients flexibles.

**Request Body:**
```json
{
  "customer": {
    "name": "Marie Claire Dubois", // Format simple - sera normalisé
    // OU format explicite:
    "firstName": "Marie",
    "lastName": "Dubois",
    "email": "marie@example.com",
    "phone": "+33123456789",
    "notes": "Anniversaire de mariage"
  },
  "dateTime": "2025-06-07T20:00:00.000Z",
  "partySize": 4,
  "duration": 120, // minutes
  "specialRequests": [
    "Table avec vue",
    "Bouteille de champagne"
  ],
  "source": "online" // online, phone, walk_in
}
```

#### PATCH /reservations/:id/assign-table
Assigner une table à une réservation.

**Request Body:**
```json
{
  "floorPlanId": "plan_id",
  "tableNumber": "12"
}
```

### Gestion du Menu

#### GET /menu
Liste du menu avec filtres et pagination.

**Query Parameters:**
- `category` (string): Filtrer par catégorie
- `isAvailable` (boolean): Seulement les plats disponibles
- `dietary` (string): vegetarian, vegan, gluten_free
- `priceMin` / `priceMax` (number): Fourchette de prix
- `search` (string): Recherche textuelle

#### GET /menu/categories
Liste des catégories disponibles.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "appetizers",
        "displayName": "Entrées",
        "count": 8,
        "priceRange": { "min": 8, "max": 18 }
      },
      {
        "name": "mains",
        "displayName": "Plats principaux", 
        "count": 15,
        "priceRange": { "min": 18, "max": 35 }
      }
    ]
  }
}
```

### Plans de Salle

#### GET /floor-plans/default
Récupérer le plan de salle par défaut.

**Response:**
```json
{
  "success": true,
  "data": {
    "floorPlan": {
      "id": "plan_id",
      "name": "Rez-de-chaussée",
      "dimensions": {
        "width": 1200,
        "height": 800,
        "unit": "cm"
      },
      "tables": [
        {
          "id": "table_id",
          "number": "1",
          "capacity": 2,
          "position": { "x": 200, "y": 150 },
          "dimensions": { "width": 80, "height": 80 },
          "shape": "round",
          "status": "available",
          "isActive": true
        }
      ],
      "obstacles": [
        {
          "type": "wall",
          "position": { "x": 0, "y": 0 },
          "dimensions": { "width": 1200, "height": 20 }
        }
      ],
      "totalCapacity": 60,
      "activeTablesCount": 15
    }
  }
}
```

### Notifications

#### POST /notifications/test
Tester la configuration email.

#### POST /notifications/reservations/:id/confirmation
Envoyer un email de confirmation de réservation.

#### GET /notifications/stats
Statistiques des notifications envoyées.

---

## 📊 Modèles de Données Détaillés

### User Model

```javascript
{
  // Identifiants
  _id: ObjectId,
  firstName: String, // required
  lastName: String,  // required
  email: String,     // required, unique, lowercase

  // Authentification
  password: String,  // required, hashed with bcrypt (rounds: 12)
  role: {
    type: String,
    enum: ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen', 'guest'],
    required: true
  },

  // Contact
  phone: String,
  
  // Relations
  restaurantId: {
    type: ObjectId,
    ref: 'Restaurant',
    required: false // Optionnel pour flexibilité des tests
  },

  // Statut
  isActive: { type: Boolean, default: true },

  // Préférences
  preferences: {
    language: { type: String, default: 'fr' },
    timezone: { type: String, default: 'Europe/Paris' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },

  // Timestamps
  timestamps: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: Date,
    lastPasswordChange: Date
  },

  // Sécurité
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}
```

### Restaurant Model

```javascript
{
  // Informations de base
  name: String, // required
  description: String,
  
  // Adresse complète
  address: {
    street: String,    // required
    city: String,      // required
    zipCode: String,   // required
    country: String,   // required
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Contact
  contact: {
    phone: String,     // required
    email: String,     // required
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },

  // Caractéristiques
  cuisine: [String],   // ['française', 'italienne', 'fusion']
  priceRange: {        // €, €€, €€€, €€€€
    type: String,
    enum: ['€', '€€', '€€€', '€€€€'],
    default: '€€'
  },
  
  // Capacité
  capacity: {
    seatingCapacity: Number,  // Nombre total de places
    tablesCount: Number,      // Nombre de tables
    barCapacity: Number,      // Places au bar
    terraceCapacity: Number   // Places en terrasse
  },

  // Horaires d'ouverture
  hours: {
    monday: { 
      open: String,    // Format "HH:mm"
      close: String,   // Format "HH:mm"
      closed: Boolean  // Jour de fermeture
    },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },

  // Services et équipements
  features: {
    wifi: Boolean,
    terrace: Boolean,
    parking: Boolean,
    accessibility: Boolean,
    reservations: Boolean,
    creditCards: Boolean,
    delivery: Boolean,
    takeaway: Boolean,
    privateEvents: Boolean,
    liveMusic: Boolean
  },

  // Relations
  owner: { type: ObjectId, ref: 'User', required: true },
  
  // Statut
  isActive: { type: Boolean, default: true },
  
  // Métadonnées
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Order Model Complet

```javascript
{
  // Identifiants
  _id: ObjectId,
  orderNumber: String, // Généré automatiquement: ORD-YYYY-NNNNNN
  
  // Relations
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },
  floorPlanId: { type: ObjectId, ref: 'FloorPlan' }, // Auto-assigné si absent
  tableNumber: String, // required
  assignedServer: { type: ObjectId, ref: 'User' },

  // Client
  customer: {
    firstName: String, // Normalisé automatiquement depuis 'name'
    lastName: String,  // Normalisé automatiquement depuis 'name'
    name: String,      // Format simple accepté
    phone: String,
    email: String,
    notes: String      // Allergies, préférences
  },

  // Éléments commandés
  items: [{
    menuItem: { type: ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    
    // Variantes sélectionnées
    selectedVariant: {
      size: String,    // portion, 25cl, 50cl, etc.
      price: Number    // Prix de cette variante
    },
    
    // Personnalisations
    customizations: [String], // ['sans fromage', 'sauce à part']
    notes: String,            // Instructions spéciales
    
    // Statut spécifique à l'item
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served'],
      default: 'pending'
    },
    
    // Calculs
    lineTotal: Number // quantity * selectedVariant.price
  }],

  // Statut global
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Priorité
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },

  // Calculs financiers
  pricing: {
    subtotal: Number,    // Somme des lineTotal
    taxRate: { type: Number, default: 0.20 }, // 20% TVA
    taxAmount: Number,   // subtotal * taxRate
    discountRate: Number,
    discountAmount: Number,
    serviceCharge: Number,
    total: Number        // subtotal + taxAmount - discountAmount + serviceCharge
  },

  // Paiement
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'mobile', 'voucher'],
      default: 'card'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    processedAt: Date,
    refundAmount: Number,
    refundReason: String
  },

  // Timestamps précis
  timestamps: {
    ordered: { type: Date, default: Date.now },
    confirmed: Date,
    preparationStarted: Date,
    preparationCompleted: Date,
    served: Date,
    paid: Date,
    cancelled: Date
  },

  // Durées calculées (en minutes)
  durations: {
    confirmation: Number,    // timestamps.confirmed - timestamps.ordered
    preparation: Number,     // preparationCompleted - preparationStarted
    service: Number,         // served - preparationCompleted
    total: Number           // paid - ordered
  },

  // Notes
  notes: String,
  internalNotes: String,   // Notes staff uniquement
  
  // Feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  }
}
```

### Reservation Model Avancé

```javascript
{
  // Relations
  restaurantId: { type: ObjectId, ref: 'Restaurant', required: true },
  
  // Client avec normalisation automatique
  customer: {
    firstName: String, // Extrait de 'name' si fourni
    lastName: String,  // Extrait de 'name' si fourni
    name: String,      // Format simple accepté
    email: String,     // required
    phone: String,     // required
    notes: String,
    // Préférences client
    preferences: {
      seatingPreference: String, // 'window', 'quiet', 'bar'
      specialDiet: [String],     // Allergies, régimes
      frequentGuest: Boolean
    }
  },

  // Détails de la réservation
  dateTime: { type: Date, required: true },
  partySize: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 20 
  },
  duration: { 
    type: Number, 
    default: 120,  // minutes
    min: 30,
    max: 480
  },

  // Assignment de table
  tableAssigned: {
    floorPlanId: { type: ObjectId, ref: 'FloorPlan' },
    tableNumber: String,
    assignedAt: Date,
    assignedBy: { type: ObjectId, ref: 'User' }
  },

  // Demandes spéciales
  specialRequests: [String], // ['birthday cake', 'wheelchair access']
  occasion: String,          // 'birthday', 'anniversary', 'business'
  
  // Statut avec timestamps
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },

  // Source de la réservation
  source: {
    type: String,
    enum: ['online', 'phone', 'walk_in', 'app'],
    default: 'online'
  },

  // Staff assigné
  assignedTo: { type: ObjectId, ref: 'User' },

  // Notifications
  notifications: {
    confirmationSent: Date,
    confirmationEmailId: String,
    reminderSent: Date,
    reminderEmailId: String,
    emailStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'bounced']
    },
    smsStatus: String
  },

  // Timestamps
  timestamps: {
    requested: { type: Date, default: Date.now },
    confirmed: Date,
    seated: Date,
    completed: Date,
    cancelled: Date,
    lastModified: { type: Date, default: Date.now }
  },

  // Historique des modifications
  history: [{
    action: String,     // 'created', 'confirmed', 'modified', 'cancelled'
    performedBy: { type: ObjectId, ref: 'User' },
    timestamp: Date,
    details: String,
    previousValues: Object
  }],

  // Informations de suivi
  tracking: {
    confirmationToken: String,
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}
```

---

## 🔐 Système d'Authentification

### Architecture JWT

```javascript
// Token Structure
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "staff_floor",
    "restaurantId": "restaurant_id",
    "permissions": ["orders:read", "orders:write"],
    "iat": 1640995200,  // Issued At
    "exp": 1641081600   // Expires (24h later)
  },
  "signature": "generated_with_secret"
}
```

### Middleware d'Authentification

```javascript
// src/middleware/auth.js
const auth = async (req, res, next) => {
  try {
    // 1. Extraire le token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification requis'
      });
    }

    // 2. Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Récupérer l'utilisateur complet
    const user = await User.findById(decoded.id)
      .populate('restaurantId', 'name isActive')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    // 4. Vérifier que le restaurant est actif (si applicable)
    if (user.restaurantId && !user.restaurantId.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Restaurant inactif'
      });
    }

    // 5. Attacher l'utilisateur à la requête
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};
```

### Génération de Token

```javascript
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId?._id || user.restaurantId,
    permissions: getPermissionsForRole(user.role)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
    issuer: 'zengest-api',
    audience: 'zengest-clients'
  });
};
```

### Sécurité Avancée

#### Rate Limiting
```javascript
// Rate limiting par type d'opération
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 tentatives
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion'
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => req.headers.authorization ? 200 : 100
});
```

#### Protection CSRF
```javascript
// Headers sécurisés avec Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

---

## 🛡️ Gestion des Permissions

### Hiérarchie des Rôles

```
ADMIN (Super-utilisateur)
├── Accès complet multi-restaurants
├── Gestion utilisateurs globale
├── Configuration système
└── Analytics globaux

OWNER (Propriétaire restaurant)
├── Gestion complète de SON restaurant
├── Création utilisateurs restaurant
├── Analytics restaurant
└── Configuration restaurant

MANAGER (Manager restaurant)
├── Gestion opérationnelle
├── Réservations et planning
├── Reports et statistiques
└── Supervision staff

STAFF_FLOOR (Serveur salle)
├── Commandes et service
├── Réservations (lecture/modification)
├── Plans de salle
└── Menu (lecture)

STAFF_BAR (Barman)
├── Commandes boissons
├── Stock bar
├── Menu boissons
└── Préparations

STAFF_KITCHEN (Cuisine)
├── Commandes cuisine
├── Préparation plats
├── Stock cuisine
└── Menu cuisine

GUEST (Invité/Lecture seule)
├── Consultation menu
├── Statut restaurant
└── Informations publiques
```

### Matrice des Permissions

| Ressource | Admin | Owner | Manager | Staff Floor | Staff Bar | Staff Kitchen | Guest |
|-----------|-------|-------|---------|-------------|-----------|---------------|-------|
| **Utilisateurs** |
| Créer | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lire | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| Modifier | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supprimer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Restaurants** |
| Créer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lire | ✅ | ✅* | ✅* | ✅* | ✅* | ✅* | ✅** |
| Modifier | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supprimer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Commandes** |
| Créer | ✅ | ✅* | ✅* | ✅* | ✅*** | ✅*** | ❌ |
| Lire | ✅ | ✅* | ✅* | ✅* | ✅**** | ✅**** | ❌ |
| Modifier | ✅ | ✅* | ✅* | ✅* | ✅*** | ✅*** | ❌ |
| Supprimer | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| **Menu** |
| Créer | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| Lire | ✅ | ✅* | ✅* | ✅* | ✅* | ✅* | ✅** |
| Modifier | ✅ | ✅* | ✅* | ❌ | ❌ | ❌ | ❌ |
| **Réservations** |
| Créer | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ |
| Lire | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ |
| Modifier | ✅ | ✅* | ✅* | ✅* | ❌ | ❌ | ❌ |

**Légende:**
- ✅ Accès complet
- ✅* Accès limité à son restaurant
- ✅** Accès lecture seule aux infos publiques
- ✅*** Accès limité aux items de sa spécialité
- ✅**** Accès lecture aux commandes de sa spécialité
- ❌ Accès refusé

### Middleware de Vérification

```javascript
// Vérification des rôles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Vérification du même restaurant
const requireSameRestaurant = (req, res, next) => {
  const { role, restaurantId } = req.user;
  
  // Admin peut accéder à tous les restaurants
  if (role === 'admin') {
    return next();
  }

  // Autres rôles: vérifier le restaurant
  const targetRestaurantId = req.params.restaurantId || 
                            req.body.restaurantId || 
                            req.query.restaurantId;

  if (targetRestaurantId && targetRestaurantId !== restaurantId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Accès limité à votre restaurant'
    });
  }

  next();
};

// Usage dans les routes
router.get('/users', 
  auth, 
  requireRole(['admin', 'owner', 'manager']), 
  requireSameRestaurant,
  userController.getAllUsers
);
```

---

## ⚡ Fonctionnalités Avancées

### 1. Gestion Automatique FloorPlan

Le système gère automatiquement l'attribution du plan de salle par défaut si aucun n'est spécifié lors de la création d'une commande.

```javascript
// Dans orderController.js
exports.createOrder = async (req, res) => {
  try {
    let { floorPlanId, tableNumber, customer, items } = req.body;
    
    // Gestion automatique du floorPlanId
    if (!floorPlanId) {
      const FloorPlan = require('../models/FloorPlan');
      const defaultPlan = await FloorPlan.findOne({ 
        restaurantId: req.user.restaurantId,
        isDefault: true 
      });
      
      if (defaultPlan) {
        floorPlanId = defaultPlan._id;
        console.log('Plan par défaut utilisé:', defaultPlan.name);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Aucun plan de salle par défaut configuré'
        });
      }
    }
    
    // Suite de la création...
  }
};
```

### 2. Normalisation Automatique des Clients

Le système accepte différents formats de noms clients et les normalise automatiquement.

```javascript
// Format 1: name simple → splitting automatique
{
  "customer": {
    "name": "Jean Paul Dupont" // → firstName: "Jean", lastName: "Paul Dupont"
  }
}

// Format 2: firstName/lastName explicite
{
  "customer": {
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}

// Code de normalisation
const normalizeCustomer = (customer) => {
  if (customer.firstName && customer.lastName) {
    // Format explicite - conserver tel quel
    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`, // Généré
      ...customer
    };
  } else if (customer.name) {
    // Format simple - séparer
    const nameParts = customer.name.trim().split(' ');
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      name: customer.name,
      ...customer
    };
  }
  
  throw new Error('Nom du client requis (name ou firstName/lastName)');
};
```

### 3. Système de Pagination Avancé

Pagination intelligente avec métadonnées complètes sur tous les endpoints.

```javascript
// src/utils/pagination.js
const createPagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = Math.min(parseInt(limit) || 10, 100);
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    total: totalItems,
    limit: itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    skip: (currentPage - 1) * itemsPerPage,
    startIndex: (currentPage - 1) * itemsPerPage + 1,
    endIndex: Math.min(currentPage * itemsPerPage, totalItems)
  };
};

// Usage dans les contrôleurs
const { page = 1, limit = 10 } = req.query;
const pagination = createPagination(page, limit, 0);

const results = await Model.find(filter)
  .limit(pagination.limit)
  .skip(pagination.skip);

const total = await Model.countDocuments(filter);
const finalPagination = createPagination(page, limit, total);
```

### 4. Notifications Email Automatisées

Système complet de notifications avec templates et planification.

```javascript
// Configuration Brevo (recommandée)
const emailConfig = {
  service: 'brevo',
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// Templates d'emails
const emailTemplates = {
  reservationConfirmation: (reservation) => ({
    subject: `Confirmation de réservation - ${reservation.restaurant.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Réservation confirmée ✅</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>Date:</strong> ${new Date(reservation.dateTime).toLocaleDateString('fr-FR')}</p>
          <p><strong>Heure:</strong> ${new Date(reservation.dateTime).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
          <p><strong>Personnes:</strong> ${reservation.partySize}</p>
          <p><strong>Restaurant:</strong> ${reservation.restaurant.name}</p>
        </div>
        <p>Nous avons hâte de vous accueillir !</p>
      </div>
    `
  }),
  
  reservationReminder: (reservation) => ({
    subject: `Rappel - Votre réservation demain`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>N'oubliez pas votre réservation demain ! 📅</h2>
        <p>Nous vous attendons ${new Date(reservation.dateTime).toLocaleDateString('fr-FR')} à ${new Date(reservation.dateTime).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</p>
      </div>
    `
  })
};

// Tâches automatisées avec node-cron
const cron = require('node-cron');

// Rappels quotidiens à 10h00
cron.schedule('0 10 * * *', async () => {
  console.log('🔔 Exécution des rappels de réservation...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const reservations = await Reservation.find({
    dateTime: {
      $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
      $lt: new Date(tomorrow.setHours(23, 59, 59, 999))
    },
    status: 'confirmed',
    'notifications.reminderSent': { $exists: false }
  }).populate('restaurantId', 'name contact');
  
  for (const reservation of reservations) {
    await sendReservationReminder(reservation);
  }
});
```

### 5. Analytics et Statistiques

Système de métriques en temps réel avec agrégations MongoDB.

```javascript
// Statistiques des commandes
exports.getOrderStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo, period = 'day' } = req.query;
    
    const matchStage = {
      restaurantId: req.user.restaurantId,
      'timestamps.ordered': {
        $gte: new Date(dateFrom),
        $lte: new Date(dateTo)
      }
    };

    const statistics = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$timestamps.ordered'
            }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          averageItems: { $avg: { $size: '$items' } },
          statusBreakdown: {
            $push: '$status'
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Post-traitement pour calculer les pourcentages
    const processedStats = statistics.map(stat => ({
      period: stat._id,
      metrics: {
        totalOrders: stat.totalOrders,
        totalRevenue: Math.round(stat.totalRevenue * 100) / 100,
        averageOrderValue: Math.round(stat.averageOrderValue * 100) / 100,
        averageItems: Math.round(stat.averageItems * 10) / 10
      },
      statusBreakdown: {
        pending: stat.statusBreakdown.filter(s => s === 'pending').length,
        confirmed: stat.statusBreakdown.filter(s => s === 'confirmed').length,
        completed: stat.statusBreakdown.filter(s => s === 'paid').length
      }
    }));

    res.json({
      success: true,
      data: {
        statistics: processedStats,
        summary: {
          totalPeriods: processedStats.length,
          totalRevenue: processedStats.reduce((sum, stat) => sum + stat.metrics.totalRevenue, 0),
          totalOrders: processedStats.reduce((sum, stat) => sum + stat.metrics.totalOrders, 0)
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques'
    });
  }
};
```

### 6. Gestion d'Erreurs Avancée

Système de gestion d'erreurs avec logging structuré et codes d'erreur spécialisés.

```javascript
// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  // Structuration de l'erreur
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.email || 'anonymous',
    timestamp: new Date().toISOString(),
    requestId: res.get('X-Request-ID')
  };

  console.error('🚨 Erreur détectée:', errorInfo);

  // Gestion spécialisée par type d'erreur
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value,
      kind: e.kind
    }));

    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données',
      errors,
      type: 'ValidationError',
      code: 'VALIDATION_FAILED'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Identifiant invalide: ${err.value}`,
      field: err.path,
      type: 'CastError',
      code: 'INVALID_ID'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      success: false,
      message: `${field} "${value}" existe déjà`,
      field,
      type: 'DuplicateError',
      code: 'DUPLICATE_ENTRY'
    });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token d\'authentification invalide',
      type: 'AuthenticationError',
      code: 'INVALID_TOKEN'
    });
  }

  // Erreur générique
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 500 ? 'Erreur serveur interne' : err.message,
    type: 'ServerError',
    code: 'INTERNAL_ERROR',
    requestId: res.get('X-Request-ID'),
    timestamp: new Date().toISOString()
  });
});
```

---

## 🛠️ Scripts et Outils

### Scripts NPM Disponibles

```bash
# === DÉVELOPPEMENT ===
npm run dev              # Démarrage avec --watch (Node 18+)
npm run dev:legacy       # Démarrage avec nodemon
npm run dev:debug        # Mode debug avec inspector

# === TESTS ===
npm test                 # Tests Jest
npm run test:watch       # Tests en mode watch
npm run test:coverage    # Couverture de code
npm run test:ci          # Tests en CI/CD
npm run test:api         # Tests d'intégration API

# === QUALITÉ CODE ===
npm run lint             # ESLint
npm run lint:fix         # Correction automatique
npm run format           # Prettier
npm run validate         # Lint + tests

# === DONNÉES ===
npm run seed             # Données de base
npm run seed:complete    # Données complètes
npm run seed:menu        # Menu uniquement
npm run seed:orders      # Commandes de test
npm run seed:reservations # Réservations
npm run seed:clean       # Vider la base
npm run seed:reset       # Nettoyer et re-seeder

# === MAINTENANCE ===
npm run backup:db        # Sauvegarde base
npm run restore:db       # Restauration
npm run health           # Vérification santé
npm run docs             # Génération docs
```

### Scripts de Diagnostic

#### diagnostic-complet.js
Script d'analyse complète du système avec recommandations.

```bash
node diagnostic-complet.js
```

**Fonctionnalités:**
- Vérification structure fichiers
- Analyse des modèles de données
- Test des contrôleurs et routes
- Validation de la configuration
- Recommandations de corrections

#### test-complete-zengest.js
Test complet de toutes les fonctionnalités avec rapport détaillé.

```bash
node test-complete-zengest.js
```

**Couverture:**
- Tests d'authentification pour tous les rôles
- Validation des permissions
- Test des CRUD complets
- Vérification des fonctionnalités avancées
- Rapport de taux de réussite

### Scripts de Correction

#### fix-zengest-errors.js
Correction automatique des erreurs courantes.

```bash
node fix-zengest-errors.js
```

**Corrections appliquées:**
- Version undefined dans app.js
- Rôles en minuscules dans User.js
- Méthodes manquantes dans les contrôleurs
- Gestion floorPlanId automatique
- Normalisation des noms clients

#### create-missing-controllers.js
Génération automatique des contrôleurs manquants.

```bash
node create-missing-controllers.js
```

**Contrôleurs générés:**
- restaurantController.js complet
- userController.js avec pagination
- Utilitaire pagination.js

### Scripts de Validation

#### quick-validation-test.js
Test rapide des corrections appliquées.

```bash
node quick-validation-test.js
```

#### post-corrections.js
Validation post-corrections avec tests ciblés.

```bash
node post-corrections.js
```

---

## 🧪 Tests et Validation

### Configuration Jest

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  testMatch: [
    '<rootDir>/src/tests/**/*.test.js',
    '<rootDir>/src/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/scripts/**',
    '!server.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000
};
```

### Tests d'Authentification

```javascript
// src/tests/auth.test.js
describe('Authentication API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await seedTestUsers();
  });

  describe('POST /auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@zengest.com',
          password: 'Admin123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('admin@zengest.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@zengest.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('invalides');
    });

    test('should enforce rate limiting', async () => {
      // 5 tentatives rapides
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@zengest.com', password: 'wrong' });
      }

      // 6ème tentative doit être bloquée
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@zengest.com', password: 'wrong' })
        .expect(429);

      expect(response.body.message).toContain('Trop de tentatives');
    });
  });
});
```

### Tests d'Intégration

```javascript
// src/tests/orders.integration.test.js
describe('Orders Integration', () => {
  let adminToken, staffToken, restaurant, floorPlan, menuItem;

  beforeAll(async () => {
    // Setup complet de l'environnement de test
    const adminUser = await User.create({
      firstName: 'Admin', lastName: 'Test',
      email: 'admin@test.com', password: 'Admin123!',
      role: 'admin'
    });
    
    adminToken = generateToken(adminUser);
    
    restaurant = await Restaurant.create({
      name: 'Restaurant Test',
      address: { street: '123 Test St', city: 'Paris', zipCode: '75001', country: 'France' },
      contact: { phone: '+33123456789', email: 'test@test.com' },
      owner: adminUser._id
    });
    
    // ... setup staff, floorPlan, menuItem
  });

  test('Complete order workflow', async () => {
    // 1. Créer commande
    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        tableNumber: '5',
        customer: { name: 'Client Test' },
        items: [{
          menuItem: menuItem._id,
          quantity: 2,
          price: 15.50
        }]
      })
      .expect(201);

    const orderId = orderResponse.body.data.order.id;

    // 2. Confirmer commande
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'confirmed' })
      .expect(200);

    // 3. Passage en préparation
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'preparing' })
      .expect(200);

    // 4. Prêt à servir
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'ready' })
      .expect(200);

    // 5. Servi
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'served' })
      .expect(200);

    // 6. Paiement
    const paymentResponse = await request(app)
      .post(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ 
        method: 'card',
        amount: 37.20 
      })
      .expect(200);

    expect(paymentResponse.body.data.order.status).toBe('paid');
  });
});
```

### Tests de Performance

```javascript
// src/tests/performance.test.js
describe('Performance Tests', () => {
  test('should handle concurrent order creation', async () => {
    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const promise = request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          tableNumber: `${i}`,
          customer: { name: `Client ${i}` },
          items: [{ menuItem: menuItem._id, quantity: 1, price: 10 }]
        });
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });

    const orderCount = await Order.countDocuments();
    expect(orderCount).toBe(concurrentRequests);
  });

  test('pagination should be efficient with large datasets', async () => {
    // Créer 1000 commandes
    const orders = [];
    for (let i = 0; i < 1000; i++) {
      orders.push({
        restaurantId: restaurant._id,
        tableNumber: `${i}`,
        customer: { firstName: 'Test', lastName: `User${i}` },
        items: [{ menuItem: menuItem._id, quantity: 1, price: 10 }],
        status: 'pending'
      });
    }
    await Order.insertMany(orders);

    const start = Date.now();
    
    const response = await request(app)
      .get('/api/orders?page=50&limit=10')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);

    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500); // < 500ms
    expect(response.body.data.orders.length).toBe(10);
    expect(response.body.data.pagination.currentPage).toBe(50);
  });
});
```

### Tests de Sécurité

```javascript
// src/tests/security.test.js
describe('Security Tests', () => {
  test('should prevent SQL injection attempts', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .get(`/api/users?search=${encodeURIComponent(maliciousInput)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    // Vérifier que la table users existe toujours
    const userCount = await User.countDocuments();
    expect(userCount).toBeGreaterThan(0);
  });

  test('should sanitize XSS attempts', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        tableNumber: '1',
        customer: { name: xssPayload },
        items: [{ menuItem: menuItem._id, quantity: 1, price: 10 }]
      })
      .expect(201);

    const order = await Order.findById(response.body.data.order.id);
    expect(order.customer.firstName).not.toContain('<script>');
  });

  test('should enforce CORS policy', async () => {
    const response = await request(app)
      .options('/api/orders')
      .set('Origin', 'https://malicious-site.com')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
  });
});
```

---

## 🚀 Déploiement et Production

### Variables d'Environnement Production

```env
# === PRODUCTION SETTINGS ===
NODE_ENV=production
PORT=3000

# === DATABASE ===
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zengest_prod

# === SECURITY ===
JWT_SECRET=your_256_bit_production_secret
BCRYPT_ROUNDS=12

# === EMAIL ===
EMAIL_SERVICE=brevo
EMAIL_USER=notifications@yourrestaurant.com
EMAIL_PASSWORD=your_production_smtp_key

# === EXTERNAL SERVICES ===
SENTRY_DSN=your_sentry_dsn_for_error_tracking
REDIS_URL=redis://localhost:6379

# === PERFORMANCE ===
ENABLE_COMPRESSION=true
ENABLE_CLUSTERING=true
MAX_CONNECTIONS=1000
```

### Configuration Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/zengest
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs

  mongo:
    image: mongo:6
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  mongo_data:
  redis_data:
  uploads:
  logs:
```

### Configuration Nginx

```nginx
# nginx.conf
upstream zengest_backend {
    server app:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API routes
    location /api/ {
        proxy_pass http://zengest_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /uploads/ {
        alias /app/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://zengest_backend/api/health;
        access_log off;
    }
}
```

### Scripts de Déploiement

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Déploiement Zengest Backend"

# 1. Vérifications pré-déploiement
echo "📋 Vérifications..."
npm run validate
npm run test:ci

# 2. Build et optimisation
echo "🔨 Build..."
npm run build

# 3. Sauvegarde base de données
echo "💾 Sauvegarde..."
npm run backup:db

# 4. Mise à jour dépendances
echo "📦 Mise à jour dépendances..."
npm ci --only=production

# 5. Migration base de données
echo "🗄️ Migrations..."
npm run migrate

# 6. Redémarrage services
echo "🔄 Redémarrage..."
docker-compose down
docker-compose up -d --build

# 7. Vérification santé
echo "🏥 Vérification santé..."
sleep 10
curl -f http://localhost:3000/api/health || exit 1

# 8. Tests post-déploiement
echo "🧪 Tests post-déploiement..."
npm run test:integration

echo "✅ Déploiement terminé avec succès!"
```

### Monitoring et Alertes

```javascript
// monitoring.js
const promClient = require('prom-client');

// Métriques custom
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const orderProcessingTime = new promClient.Histogram({
  name: 'order_processing_time_seconds',
  help: 'Time to process orders',
  labelNames: ['status']
});

// Middleware de collecte
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Endpoint métriques
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

---

## 📊 Maintenance et Monitoring

### Scripts de Maintenance

```javascript
// src/scripts/maintenance.js
const maintenanceTasks = {
  // Nettoyage des logs anciens
  cleanOldLogs: async () => {
    const fs = require('fs').promises;
    const path = require('path');
    const logDir = path.join(__dirname, '../../logs');
    
    const files = await fs.readdir(logDir);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < oneMonthAgo) {
        await fs.unlink(filePath);
        console.log(`🗑️ Log supprimé: ${file}`);
      }
    }
  },

  // Nettoyage des réservations expirées
  cleanExpiredReservations: async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const result = await Reservation.deleteMany({
      status: { $in: ['cancelled', 'no_show'] },
      'timestamps.cancelled': { $lt: oneWeekAgo }
    });
    
    console.log(`🧹 ${result.deletedCount} réservations expirées supprimées`);
  },

  // Optimisation des index
  optimizeIndexes: async () => {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const collections = ['users', 'orders', 'reservations', 'menu'];
    
    for (const collectionName of collections) {
      await db.collection(collectionName).reIndex();
      console.log(`📊 Index optimisés pour ${collectionName}`);
    }
  },

  // Génération de rapports
  generateWeeklyReport: async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const [orderStats, reservationStats] = await Promise.all([
      Order.aggregate([
        { $match: { 'timestamps.ordered': { $gte: oneWeekAgo } } },
        { $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' }
        }}
      ]),
      Reservation.aggregate([
        { $match: { 'timestamps.requested': { $gte: oneWeekAgo } } },
        { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }}
      ])
    ]);
    
    const report = {
      period: `${oneWeekAgo.toISOString().split('T')[0]} - ${new Date().toISOString().split('T')[0]}`,
      orders: orderStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
      reservations: reservationStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
    
    // Envoyer par email aux managers
    await sendWeeklyReport(report);
    console.log('📊 Rapport hebdomadaire généré et envoyé');
  }
};

// Planification avec node-cron
const cron = require('node-cron');

// Tous les jours à 2h00 - Nettoyage
cron.schedule('0 2 * * *', maintenanceTasks.cleanOldLogs);

// Tous les dimanches à 23h00 - Nettoyage réservations
cron.schedule('0 23 * * 0', maintenanceTasks.cleanExpiredReservations);

// Tous les mois le 1er à 1h00 - Optimisation index
cron.schedule('0 1 1 * *', maintenanceTasks.optimizeIndexes);

// Tous les lundis à 9h00 - Rapport hebdomadaire
cron.schedule('0 9 * * 1', maintenanceTasks.generateWeeklyReport);
```

### Système de Logs Avancé

```javascript
// src/config/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'zengest-api' },
  transports: [
    // Logs de erreurs
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Logs généraux
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    
    // Console en développement
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// Logs structurés spécialisés
const loggers = {
  auth: logger.child({ component: 'auth' }),
  orders: logger.child({ component: 'orders' }),
  reservations: logger.child({ component: 'reservations' }),
  database: logger.child({ component: 'database' }),
  email: logger.child({ component: 'email' })
};

module.exports = { logger, loggers };
```

### Monitoring de Performance

```javascript
// src/utils/performance.js
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      responseTime: new Map(),
      memoryUsage: [],
      dbConnections: 0,
      activeRequests: 0
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitoring mémoire toutes les 30 secondes
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.push({
        timestamp: new Date(),
        heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memUsage.heapTotal / 1024 / 1024,
        rss: memUsage.rss / 1024 / 1024
      });
      
      // Garder seulement les 120 dernières mesures (1 heure)
      if (this.metrics.memoryUsage.length > 120) {
        this.metrics.memoryUsage.shift();
      }
      
      // Alerte si mémoire > 500MB
      if (memUsage.heapUsed / 1024 / 1024 > 500) {
        logger.warn('High memory usage detected', {
          heapUsed: memUsage.heapUsed / 1024 / 1024,
          threshold: 500
        });
      }
    }, 30000);
  }

  trackRequest(req, res) {
    const start = Date.now();
    this.metrics.activeRequests++;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const route = req.route?.path || req.path;
      
      // Stocker les temps de réponse
      if (!this.metrics.responseTime.has(route)) {
        this.metrics.responseTime.set(route, []);
      }
      
      const routeMetrics = this.metrics.responseTime.get(route);
      routeMetrics.push(duration);
      
      // Garder seulement les 100 dernières mesures par route
      if (routeMetrics.length > 100) {
        routeMetrics.shift();
      }
      
      this.metrics.activeRequests--;
      
      // Alerte si temps de réponse > 5 secondes
      if (duration > 5000) {
        logger.warn('Slow request detected', {
          route,
          duration,
          method: req.method,
          threshold: 5000
        });
      }
    });
  }

  getMetrics() {
    const responseTimeStats = {};
    
    for (const [route, times] of this.metrics.responseTime) {
      if (times.length > 0) {
        const sorted = [...times].sort((a, b) => a - b);
        responseTimeStats[route] = {
          count: times.length,
          avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          min: Math.min(...times),
          max: Math.max(...times),
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    }

    return {
      responseTime: responseTimeStats,
      memory: this.metrics.memoryUsage.slice(-1)[0] || {},
      activeRequests: this.metrics.activeRequests,
      uptime: Math.floor(process.uptime())
    };
  }
}

const performanceMonitor = new PerformanceMonitor();

// Middleware
const trackPerformance = (req, res, next) => {
  performanceMonitor.trackRequest(req, res);
  next();
};

module.exports = { performanceMonitor, trackPerformance };
```

---

## 🐛 Dépannage et FAQ

### Problèmes Courants

#### 1. Erreur de Connexion MongoDB

**Symptôme:**
```
MongoNetworkError: failed to connect to server [localhost:27017]
```

**Solutions:**
```bash
# Vérifier si MongoDB est démarré
sudo systemctl status mongod

# Démarrer MongoDB
sudo systemctl start mongod

# Ou avec Docker
docker run -d -p 27017:27017 mongo:6

# Vérifier la connexion
mongo --eval "db.runCommand('ping')"
```

#### 2. Erreur JWT malformed

**Symptôme:**
```
JsonWebTokenError: jwt malformed
```

**Solutions:**
```bash
# 1. Vérifier JWT_SECRET dans .env
echo $JWT_SECRET

# 2. Générer un nouveau secret sécurisé
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Redémarrer le serveur après modification
npm run dev

# 4. Vérifier le format du token côté client
# Le token doit être: "Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### 3. Port déjà utilisé

**Symptôme:**
```
Error: listen EADDRINUSE :::3000
```

**Solutions:**
```bash
# Trouver le processus utilisant le port
lsof -ti:3000

# Terminer le processus
kill -9 $(lsof -ti:3000)

# Ou utiliser un autre port
PORT=3001 npm run dev

# Ou dans .env
PORT=3001
```

#### 4. Emails non envoyés

**Symptôme:**
```
Error: Invalid login: 535 authentication failed
```

**Solutions Brevo:**
```env
# Configuration Brevo correcte
EMAIL_SERVICE=brevo
EMAIL_USER=votre.email@domaine.com
EMAIL_PASSWORD=votre_cle_smtp_brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Solutions Gmail:**
```bash
# 1. Activer la validation en 2 étapes
# 2. Générer un App Password
# 3. Utiliser ce mot de passe de 16 caractères

EMAIL_SERVICE=gmail
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App Password
```

**Test de configuration:**
```bash
node test-email.js
```

#### 5. Erreur 500 sur /orders

**Symptôme:**
```
Error: Cannot read property 'page' of undefined
```

**Solution:**
```bash
# Correction automatique
node fix-orders-controller.js

# Vérifier le contrôleur
cat src/controllers/orderController.js | grep "getAllOrders"

# Redémarrer
npm run dev
```

#### 6. Rôles non reconnus

**Symptôme:**
```
ValidationError: role is not a valid enum value
```

**Solution:**
Les rôles doivent être en **minuscules**:
```javascript
// ✅ Correct
{ role: 'staff_floor' }
{ role: 'staff_bar' }
{ role: 'staff_kitchen' }

// ❌ Incorrect
{ role: 'STAFF_FLOOR' }
{ role: 'Staff_Floor' }
```

### Scripts de Diagnostic

#### Diagnostic Complet
```bash
node diagnostic-complet.js
```

#### Test de Validation Rapide
```bash
node quick-validation-test.js
```

#### Test Complet du Système
```bash
node test-complete-zengest.js
```

### Logs et Debug

#### Vérifier les Logs
```bash
# Logs du serveur
tail -f logs/combined-$(date +%Y-%m-%d).log

# Logs d'erreurs uniquement
tail -f logs/error-$(date +%Y-%m-%d).log

# Logs en temps réel
npm run dev
```

#### Mode Debug
```bash
# Démarrage avec debugger
npm run dev:debug

# Dans Chrome: chrome://inspect
# Ou dans VS Code: F5 avec configuration Node.js
```

### FAQ Technique

#### Q: Comment ajouter un nouveau rôle ?

**R:** Modifier le modèle User et les permissions:

```javascript
// 1. src/models/User.js
role: {
  type: String,
  enum: ['admin', 'owner', 'manager', 'staff_floor', 'staff_bar', 'staff_kitchen', 'nouveau_role'],
  required: true
}

// 2. src/utils/constants.js
const USER_ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  STAFF_FLOOR: 'staff_floor',
  STAFF_BAR: 'staff_bar',
  STAFF_KITCHEN: 'staff_kitchen',
  NOUVEAU_ROLE: 'nouveau_role'
};

// 3. src/middleware/auth.js - Ajouter les permissions
const getPermissionsForRole = (role) => {
  const permissions = {
    admin: ['*'],
    owner: ['restaurants:read', 'restaurants:write', 'users:read', 'users:write'],
    // ... autres rôles
    nouveau_role: ['permissions:specifiques']
  };
  return permissions[role] || [];
};
```

#### Q: Comment configurer HTTPS en développement ?

**R:** Utiliser mkcert pour des certificats locaux:

```bash
# Installer mkcert
brew install mkcert  # macOS
# ou
choco install mkcert  # Windows

# Créer une autorité de certification locale
mkcert -install

# Générer des certificats
mkcert localhost 127.0.0.1 ::1

# Modifier server.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem')
};

https.createServer(options, app).listen(3443, () => {
  console.log('HTTPS Server running on https://localhost:3443');
});
```

#### Q: Comment optimiser les performances ?

**R:** Plusieurs stratégies:

```javascript
// 1. Index MongoDB optimisés
db.orders.createIndex({ "restaurantId": 1, "status": 1 })
db.orders.createIndex({ "timestamps.ordered": -1 })
db.reservations.createIndex({ "restaurantId": 1, "dateTime": 1 })
db.users.createIndex({ "email": 1 }, { unique: true })

// 2. Pagination efficace
const orders = await Order.find(filter)
  .select('customer.name status pricing.total timestamps.ordered') // Sélection de champs
  .populate('assignedServer', 'firstName lastName') // Population limitée
  .sort({ 'timestamps.ordered': -1 })
  .limit(pagination.limit)
  .skip(pagination.skip)
  .lean(); // Objets JavaScript natifs (plus rapide)

// 3. Cache avec Redis
const redis = require('redis');
const client = redis.createClient();

const getCachedMenu = async (restaurantId) => {
  const cacheKey = `menu:${restaurantId}`;
  const cached = await client.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const menu = await MenuItem.find({ restaurantId }).lean();
  await client.setex(cacheKey, 300, JSON.stringify(menu)); // Cache 5min
  return menu;
};

// 4. Compression des réponses
app.use(compression({
  level: 6,
  threshold: 1024
}));
```

#### Q: Comment gérer les uploads de fichiers ?

**R:** Utiliser Multer avec validation:

```javascript
// src/middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Usage
router.post('/menu/:id/image', 
  auth, 
  upload.single('image'), 
  menuController.uploadImage
);
```

#### Q: Comment implémenter la recherche avancée ?

**R:** Utiliser les agrégations MongoDB:

```javascript
// Recherche multi-critères avec MongoDB
exports.advancedSearch = async (req, res) => {
  try {
    const { 
      query, 
      category, 
      priceMin, 
      priceMax, 
      dietary,
      sortBy = 'relevance'
    } = req.query;

    const pipeline = [];

    // 1. Filtres de base
    const matchStage = {
      restaurantId: req.user.restaurantId,
      isActive: true
    };

    if (category) matchStage.category = category;
    if (priceMin || priceMax) {
      matchStage.basePrice = {};
      if (priceMin) matchStage.basePrice.$gte = parseFloat(priceMin);
      if (priceMax) matchStage.basePrice.$lte = parseFloat(priceMax);
    }

    pipeline.push({ $match: matchStage });

    // 2. Recherche textuelle avec score
    if (query) {
      pipeline.unshift({
        $match: {
          $text: { $search: query }
        }
      });
      pipeline.push({
        $addFields: {
          score: { $meta: "textScore" }
        }
      });
    }

    // 3. Filtres diététiques
    if (dietary) {
      const dietaryFilters = dietary.split(',');
      dietaryFilters.forEach(filter => {
        if (filter === 'vegetarian') {
          matchStage['dietary.isVegetarian'] = true;
        } else if (filter === 'vegan') {
          matchStage['dietary.isVegan'] = true;
        } else if (filter === 'gluten_free') {
          matchStage['dietary.isGlutenFree'] = true;
        }
      });
    }

    // 4. Tri
    const sortStage = {};
    switch (sortBy) {
      case 'price_asc':
        sortStage.basePrice = 1;
        break;
      case 'price_desc':
        sortStage.basePrice = -1;
        break;
      case 'name':
        sortStage.name = 1;
        break;
      case 'relevance':
      default:
        if (query) {
          sortStage.score = { $meta: "textScore" };
        } else {
          sortStage.displayOrder = 1;
        }
    }
    pipeline.push({ $sort: sortStage });

    // 5. Pagination
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // 6. Exécution
    const [results, totalCount] = await Promise.all([
      MenuItem.aggregate(pipeline),
      MenuItem.countDocuments(matchStage)
    ]);

    res.json({
      success: true,
      data: {
        items: results,
        pagination: createPagination(page, limit, totalCount),
        filters: {
          query,
          category,
          priceRange: { min: priceMin, max: priceMax },
          dietary,
          sortBy
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
```

### Optimisations de Production

#### Configuration PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'zengest-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=4096',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

// Commandes PM2
pm2 start ecosystem.config.js
pm2 status
pm2 logs zengest-api
pm2 reload zengest-api
```

#### Monitoring avec Prometheus

```javascript
// metrics.js
const promClient = require('prom-client');

// Collecte des métriques par défaut
promClient.collectDefaultMetrics({
  timeout: 5000,
  prefix: 'zengest_'
});

// Métriques custom
const httpRequestsTotal = new promClient.Counter({
  name: 'zengest_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'zengest_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const ordersProcessed = new promClient.Counter({
  name: 'zengest_orders_processed_total',
  help: 'Total number of orders processed',
  labelNames: ['status', 'restaurant_id']
});

const activeReservations = new promClient.Gauge({
  name: 'zengest_active_reservations',
  help: 'Number of active reservations',
  labelNames: ['restaurant_id']
});

// Middleware de collecte
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || 'unknown';
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
      
    httpRequestDuration
      .labels(req.method, route)
      .observe(duration);
  });
  
  next();
};

module.exports = {
  promClient,
  httpRequestsTotal,
  httpRequestDuration,
  ordersProcessed,
  activeReservations,
  metricsMiddleware
};
```

---

## 🎯 Conclusion

### Récapitulatif des Fonctionnalités

Le backend Zengest offre une solution complète et robuste pour la gestion de restaurants avec :

#### ✅ Fonctionnalités Core
- **Authentification JWT sécurisée** avec rôles hiérarchiques
- **Gestion multi-restaurant** avec isolation des données
- **API RESTful complète** avec documentation intégrée
- **Validation robuste** des données avec messages d'erreur détaillés
- **Pagination intelligente** sur tous les endpoints

#### ✅ Fonctionnalités Avancées
- **FloorPlanId automatique** pour les commandes sans plan spécifié
- **Formats clients flexibles** avec normalisation automatique
- **Notifications email automatisées** avec templates personnalisables
- **Tâches planifiées** pour la maintenance et les rappels
- **Analytics en temps réel** avec métriques détaillées

#### ✅ Sécurité et Performance
- **Rate limiting** adaptatif selon l'authentification
- **Gestion d'erreurs avancée** avec codes spécialisés
- **Logs structurés** avec rotation automatique
- **Monitoring de performance** avec alertes
- **Optimisations MongoDB** avec index appropriés

### Architecture Évolutive

Le système est conçu pour évoluer facilement :

```
Phase 1 (Actuelle)
├── API RESTful complète
├── Gestion restaurant unique
├── Notifications email
└── Analytics de base

Phase 2 (Future)
├── WebSocket pour temps réel
├── Mobile API endpoints
├── Système de fidélité
└── Intégrations POS

Phase 3 (Vision)
├── Multi-tenant SaaS
├── IA pour optimisation
├── Marketplace intégré
└── Analytics prédictifs
```

### Points Forts du Système

#### 🔧 Technique
- **Node.js 18+** avec fetch natif et performance optimale
- **MongoDB** avec agrégations avancées et transactions ACID
- **Architecture modulaire** facilement extensible
- **Tests automatisés** avec couverture complète
- **Documentation exhaustive** avec exemples pratiques

#### 🏪 Métier
- **Workflow complet** de la commande au paiement
- **Gestion flexible** des plans de salle
- **Réservations intelligentes** avec notifications automatiques
- **Menu dynamique** avec variantes et disponibilité
- **Rapports détaillés** pour pilotage business

#### 🛡️ Sécurité
- **Authentification robuste** avec JWT et refresh tokens
- **Permissions granulaires** par rôle et ressource
- **Protection OWASP** contre les attaques courantes
- **Audit trail** complet des actions utilisateurs
- **Configuration sécurisée** pour la production

### Roadmap et Évolutions

#### Court Terme (Q2-Q3 2025)
- [ ] API WebSocket pour notifications temps réel
- [ ] Intégration systèmes de paiement (Stripe, PayPal)
- [ ] Module de fidélité client
- [ ] API mobile-first avec authentification biométrique
- [ ] Dashboard analytics avancé

#### Moyen Terme (Q4 2025 - Q1 2026)
- [ ] Multi-tenant SaaS avec facturisation
- [ ] IA pour prédiction de fréquentation
- [ ] Intégrations comptables (Sage, QuickBooks)
- [ ] Module de livraison avec géolocalisation
- [ ] Application mobile native

#### Long Terme (2026+)
- [ ] Marketplace inter-restaurants
- [ ] Analytics prédictifs avec ML
- [ ] IoT pour automatisation restaurant
- [ ] Blockchain pour traçabilité
- [ ] API ouverte pour écosystème partenaires

### Support et Communauté

#### 📞 Contacts
- **Support technique** : support@zengest.com
- **Documentation** : https://docs.zengest.com
- **Repository** : https://github.com/zengest/backend
- **Issues** : https://github.com/zengest/backend/issues

#### 🤝 Contribution
- **Guide contributeur** : CONTRIBUTING.md
- **Standards de code** : ESLint + Prettier configurés
- **Tests requis** : Couverture > 80%
- **Review process** : Pull Request obligatoire

#### 📚 Ressources
- **Changelog** : CHANGELOG.md pour toutes les versions
- **Migration guides** : docs/migrations/ pour les mises à jour
- **API Examples** : examples/ pour intégrations
- **Postman Collection** : zengest-api.postman_collection.json

---

## 📄 Annexes

### Codes d'Erreur API

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | Token d'authentification manquant |
| `INVALID_TOKEN` | 401 | Token invalide ou expiré |
| `INSUFFICIENT_PERMISSIONS` | 403 | Permissions insuffisantes |
| `VALIDATION_FAILED` | 400 | Erreur de validation des données |
| `DUPLICATE_ENTRY` | 400 | Violation de contrainte d'unicité |
| `RESOURCE_NOT_FOUND` | 404 | Ressource demandée non trouvée |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requêtes dépassée |
| `INTERNAL_ERROR` | 500 | Erreur serveur interne |

### Variables d'Environnement

| Variable | Type | Défaut | Description |
|----------|------|--------|-------------|
| `NODE_ENV` | string | development | Environnement d'exécution |
| `PORT` | number | 3000 | Port d'écoute du serveur |
| `MONGODB_URI` | string | - | URI de connexion MongoDB |
| `JWT_SECRET` | string | - | Secret pour signature JWT |
| `JWT_EXPIRE` | string | 24h | Durée de validité des tokens |
| `EMAIL_SERVICE` | string | brevo | Service email (brevo, gmail) |
| `ENABLE_CRON_JOBS` | boolean | true | Activation des tâches planifiées |
| `RATE_LIMIT_MAX` | number | 200 | Nombre max de requêtes par fenêtre |

### Commandes Utiles

```bash
# === DÉVELOPPEMENT ===
npm run dev                    # Démarrage développement
npm run seed                   # Initialiser données
npm run test                   # Lancer tests
npm run lint:fix              # Corriger style code

# === DIAGNOSTIC ===
node diagnostic-complet.js     # Analyse complète
node quick-validation-test.js  # Test rapide
node test-complete-zengest.js  # Test complet

# === CORRECTION ===
node fix-zengest-errors.js     # Corrections automatiques
node create-missing-controllers.js # Créer contrôleurs manquants

# === PRODUCTION ===
npm start                      # Démarrage production
npm run backup:db             # Sauvegarde base
pm2 start ecosystem.config.js # Démarrage PM2
```

---

**© 2025 Zengest Team - Documentation Backend v1.2.0**

*Cette documentation est maintenue à jour avec les dernières fonctionnalités et corrections. Pour toute question ou amélioration, n'hésitez pas à ouvrir une issue sur le repository GitHub.*

**Dernière mise à jour** : 06 juin 2025  
**Version du backend** : 1.2.0  
**Node.js minimum** : 18.0.0