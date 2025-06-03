# Documentation Backend Zengest

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Installation et Configuration](#installation-et-configuration)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Modèles de Données](#modèles-de-données)
6. [Authentification et Autorisation](#authentification-et-autorisation)
7. [Fonctionnalités Principales](#fonctionnalités-principales)
8. [Scripts Utilitaires](#scripts-utilitaires)
9. [Configuration Email](#configuration-email)
10. [Dépannage](#dépannage)
11. [Contribution](#contribution)

---

## 🚀 Introduction

**Zengest Backend** est une API complète pour la gestion de restaurants développée avec Node.js et Express. Elle offre un système complet de gestion incluant les commandes, les réservations, les plans de salle interactifs, la gestion du menu et les notifications automatisées.

### ✨ Fonctionnalités principales

- **Gestion des utilisateurs** avec authentification JWT sécurisée
- **Système de commandes** en temps réel avec statuts multiples
- **Plans de salle interactifs** avec gestion des tables
- **Gestion complète du menu** avec variantes de prix
- **Système de réservations** avec notifications email automatiques
- **Analytics et statistiques** détaillées
- **Notifications automatisées** via email (Nodemailer/Brevo)
- **Système de permissions** par rôles (Admin, Owner, Manager, Staff)
- **Rate limiting** et sécurité avancée
- **Tâches automatisées** (rappels, nettoyage, statistiques)

### 📊 Informations techniques

- **Version** : 1.2.0
- **Technologies** : Node.js (≥18.0.0), Express, MongoDB, JWT
- **Base de données** : MongoDB avec Mongoose
- **Authentification** : JSON Web Tokens (JWT)
- **Email** : Nodemailer avec support Brevo/Gmail/Outlook
- **Validation** : Joi + Express-validator
- **Sécurité** : Helmet, CORS, Rate limiting

---

## 🛠️ Installation et Configuration

### Prérequis

- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **MongoDB** (local ou cloud)

### Installation

```bash
# Cloner le projet
git clone https://github.com/zengest/backend.git
cd zengest-backend

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env
```

### Configuration (.env)

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/zengest

# JWT
JWT_SECRET=votre_secret_jwt_super_securise
JWT_EXPIRE=24h

# Serveur
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Email (Brevo recommandé)
EMAIL_SERVICE=brevo
EMAIL_USER=votre.email@domaine.com
EMAIL_PASSWORD=votre_cle_smtp
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false

# Fonctionnalités optionnelles
ENABLE_CRON_JOBS=true
```

### Démarrage

```bash
# Initialiser les données de démo
npm run seed

# Démarrer en développement
npm run dev

# Démarrer en production
npm start
```

Le serveur sera accessible sur `http://localhost:3000`

---

## 🏗️ Architecture

### Structure du projet

```
zengest-backend/
├── src/
│   ├── config/           # Configuration (DB, email, etc.)
│   ├── controllers/      # Contrôleurs API
│   ├── middleware/       # Middlewares personnalisés
│   ├── models/          # Modèles MongoDB/Mongoose
│   ├── routes/          # Routes Express
│   ├── utils/           # Utilitaires et helpers
│   ├── scripts/         # Scripts de maintenance
│   └── tests/           # Tests unitaires et d'intégration
├── logs/                # Fichiers de logs
├── uploads/             # Fichiers uploadés
├── app.js               # Configuration Express
├── server.js            # Point d'entrée principal
└── package.json         # Configuration npm
```

### Flux de données

```
Client → Express Router → Middleware Auth → Controller → Model → MongoDB
                     ↓
                Rate Limiter
                     ↓
                Validation
                     ↓
                Response
```

### Middleware chain

1. **Helmet** - Headers de sécurité
2. **CORS** - Gestion des origines
3. **Rate Limiting** - Limitation des requêtes
4. **Authentication** - Vérification JWT
5. **Validation** - Validation des données
6. **Authorization** - Vérification des permissions

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### 🔐 Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/login` | Connexion utilisateur |
| POST | `/auth/register` | Inscription (admin uniquement) |
| GET | `/auth/me` | Profil utilisateur actuel |
| POST | `/auth/logout` | Déconnexion |
| PUT | `/auth/change-password` | Changer le mot de passe |

**Exemple de connexion :**
```json
POST /api/auth/login
{
  "email": "admin@zengest.com",
  "password": "Admin123!"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "permissions": [...],
    "restaurant": { ... }
  }
}
```

### 👥 Utilisateurs

| Méthode | Endpoint | Description | Permissions |
|---------|----------|-------------|-------------|
| GET | `/users` | Liste des utilisateurs | Admin, Owner, Manager |
| GET | `/users/:id` | Détails utilisateur | Admin, Owner, Manager |
| POST | `/users` | Créer utilisateur | Admin, Owner |
| PUT | `/users/:id` | Modifier utilisateur | Admin, Owner |
| DELETE | `/users/:id` | Supprimer utilisateur | Admin |

### 🏢 Restaurants

| Méthode | Endpoint | Description | Permissions |
|---------|----------|-------------|-------------|
| GET | `/restaurants` | Liste des restaurants | Admin |
| GET | `/restaurants/:id` | Détails restaurant | Admin, Owner, Manager |
| POST | `/restaurants` | Créer restaurant | Admin |
| PUT | `/restaurants/:id` | Modifier restaurant | Admin, Owner |
| GET | `/restaurants/:id/status` | Statut restaurant | Tous |

### 🗺️ Plans de salle

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/floor-plans` | Liste des plans |
| GET | `/floor-plans/default` | Plan par défaut |
| GET | `/floor-plans/:id` | Détails du plan |
| POST | `/floor-plans` | Créer un plan |
| PUT | `/floor-plans/:id` | Modifier le plan |
| PATCH | `/floor-plans/:id/tables/:tableId/status` | Statut de table |
| GET | `/floor-plans/:id/export` | Exporter le plan |

### 🍽️ Menu

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/menu` | Liste des éléments menu |
| GET | `/menu/search` | Recherche dans le menu |
| GET | `/menu/categories` | Catégories disponibles |
| GET | `/menu/:id` | Détails d'un élément |
| POST | `/menu` | Créer élément menu |
| PUT | `/menu/:id` | Modifier élément |
| PATCH | `/menu/:id/availability` | Modifier disponibilité |
| PATCH | `/menu/:id/price` | Modifier prix |

### 📋 Commandes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/orders` | Liste des commandes |
| GET | `/orders/active` | Commandes actives |
| GET | `/orders/table/:floorPlanId/:tableId` | Commandes par table |
| GET | `/orders/:id` | Détails commande |
| POST | `/orders` | Créer commande |
| PUT | `/orders/:id` | Modifier commande |
| PATCH | `/orders/:id/status` | Changer statut |
| POST | `/orders/:id/payment` | Traiter paiement |
| GET | `/orders/statistics/summary` | Statistiques |

### 📅 Réservations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/reservations` | Liste des réservations |
| GET | `/reservations/date/:date` | Réservations par date |
| GET | `/reservations/:id` | Détails réservation |
| POST | `/reservations` | Créer réservation |
| PUT | `/reservations/:id` | Modifier réservation |
| PATCH | `/reservations/:id/status` | Changer statut |
| PATCH | `/reservations/:id/assign-table` | Assigner table |

### 📧 Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/notifications/test` | Test email |
| POST | `/notifications/reservations/:id/confirmation` | Email confirmation |
| POST | `/notifications/reservations/:id/reminder` | Email rappel |
| POST | `/notifications/batch/reminders` | Rappels groupés |
| GET | `/notifications/stats` | Statistiques email |

### 🔧 Utilitaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | État de santé API |
| GET | `/docs` | Documentation API |

---

## 📊 Modèles de Données

### User (Utilisateur)

```javascript
{
  firstName: String,        // Prénom
  lastName: String,         // Nom
  email: String,           // Email (unique)
  password: String,        // Mot de passe (hashé)
  role: String,           // ADMIN, OWNER, MANAGER, STAFF_*
  phone: String,          // Téléphone
  restaurantId: ObjectId, // Restaurant assigné
  isActive: Boolean,      // Compte actif
  timestamps: {
    createdAt: Date,
    updatedAt: Date,
    lastLogin: Date
  }
}
```

### Restaurant

```javascript
{
  name: String,           // Nom du restaurant
  description: String,    // Description
  address: {
    street: String,       // Adresse
    city: String,         // Ville
    zipCode: String,      // Code postal
    country: String       // Pays
  },
  contact: {
    phone: String,        // Téléphone
    email: String         // Email
  },
  cuisine: [String],      // Types de cuisine
  priceRange: String,     // Gamme de prix (€, €€, €€€)
  capacity: {
    seatingCapacity: Number,  // Capacité assise
    tablesCount: Number       // Nombre de tables
  },
  hours: {               // Horaires d'ouverture
    monday: { open: String, close: String, closed: Boolean },
    // ... autres jours
  },
  features: {
    wifi: Boolean,        // WiFi disponible
    terrace: Boolean,     // Terrasse
    reservations: Boolean, // Réservations acceptées
    creditCards: Boolean   // Cartes acceptées
  },
  owner: ObjectId,       // Propriétaire
  isActive: Boolean
}
```

### Order (Commande)

```javascript
{
  restaurantId: ObjectId,     // Restaurant
  floorPlanId: ObjectId,      // Plan de salle
  tableNumber: String,        // Numéro de table
  customer: {
    name: String,             // Nom client
    phone: String,            // Téléphone
    email: String,            // Email
    notes: String             // Notes spéciales
  },
  items: [{
    menuItem: ObjectId,       // Élément du menu
    quantity: Number,         // Quantité
    price: Number,            // Prix unitaire
    variants: {               // Variantes choisies
      size: String,
      customizations: [String]
    },
    notes: String             // Notes spéciales
  }],
  status: String,             // pending, confirmed, preparing, ready, served, paid, cancelled
  priority: String,           // normal, urgent
  assignedServer: ObjectId,   // Serveur assigné
  pricing: {
    subtotal: Number,         // Sous-total
    tax: Number,              // Taxes
    discount: Number,         // Remise
    total: Number             // Total
  },
  payment: {
    method: String,           // cash, card, online
    status: String,           // pending, completed, failed
    transactionId: String     // ID transaction
  },
  timestamps: {
    ordered: Date,            // Commande passée
    confirmed: Date,          // Confirmée
    prepared: Date,           // Préparée
    served: Date,             // Servie
    paid: Date                // Payée
  }
}
```

### FloorPlan (Plan de salle)

```javascript
{
  name: String,              // Nom du plan
  description: String,       // Description
  restaurantId: ObjectId,    // Restaurant
  dimensions: {
    width: Number,           // Largeur (cm)
    height: Number,          // Hauteur (cm)
    unit: String             // Unité (cm, m)
  },
  tables: [{
    number: String,          // Numéro de table
    capacity: Number,        // Capacité
    position: {
      x: Number,             // Position X
      y: Number              // Position Y
    },
    dimensions: {
      width: Number,         // Largeur
      height: Number         // Hauteur
    },
    shape: String,           // round, square, rectangle
    status: String,          // available, occupied, reserved, maintenance
    isActive: Boolean
  }],
  obstacles: [{             // Obstacles (murs, etc.)
    type: String,           // wall, entrance, bar, kitchen
    position: { x: Number, y: Number },
    dimensions: { width: Number, height: Number },
    isWalkable: Boolean
  }],
  isDefault: Boolean,       // Plan par défaut
  isActive: Boolean
}
```

### MenuItem (Élément de menu)

```javascript
{
  name: String,             // Nom du plat
  description: String,      // Description
  category: String,         // Catégorie
  restaurantId: ObjectId,   // Restaurant
  priceVariants: [{         // Variantes de prix
    size: String,           // Taille (portion, 25cl, etc.)
    price: Number,          // Prix
    isDefault: Boolean      // Variante par défaut
  }],
  dietary: {
    isVegetarian: Boolean,  // Végétarien
    isVegan: Boolean,       // Végan
    isGlutenFree: Boolean,  // Sans gluten
    isSpicy: Boolean,       // Épicé
    spicyLevel: Number      // Niveau épicé (1-5)
  },
  availability: {
    isAvailable: Boolean,   // Disponible
    availableDays: [String], // Jours disponibles
    availableTimeSlots: {
      breakfast: Boolean,
      lunch: Boolean,
      dinner: Boolean
    }
  },
  inventory: {
    hasInventory: Boolean,  // Gestion stock
    currentStock: Number,   // Stock actuel
    lowStockThreshold: Number // Seuil d'alerte
  },
  images: [String],         // URLs des images
  tags: [String],           // Tags (signature, populaire, etc.)
  displayOrder: Number,     // Ordre d'affichage
  isActive: Boolean
}
```

### Reservation (Réservation)

```javascript
{
  restaurantId: ObjectId,   // Restaurant
  customer: {
    firstName: String,      // Prénom
    lastName: String,       // Nom
    email: String,          // Email
    phone: String,          // Téléphone
    notes: String           // Notes spéciales
  },
  dateTime: Date,           // Date et heure
  partySize: Number,        // Nombre de personnes
  duration: Number,         // Durée estimée (minutes)
  status: String,           // pending, confirmed, seated, completed, cancelled, no_show
  tableAssigned: {
    floorPlanId: ObjectId,  // Plan de salle
    tableNumber: String     // Numéro de table
  },
  specialRequests: [String], // Demandes spéciales
  source: String,           // online, phone, walk_in
  assignedTo: ObjectId,     // Staff assigné
  notifications: {
    confirmationSent: Date, // Confirmation envoyée
    reminderSent: Date,     // Rappel envoyé
    emailStatus: String     // delivered, failed, pending
  },
  timestamps: {
    requested: Date,        // Demande faite
    confirmed: Date,        // Confirmée
    seated: Date,           // Client installé
    completed: Date         // Terminée
  }
}
```

---

## 🔐 Authentification et Autorisation

### Rôles et Permissions

| Rôle | Description | Permissions |
|------|-------------|-------------|
| **ADMIN** | Super administrateur | Tous accès, multi-restaurants |
| **OWNER** | Propriétaire | Gestion complète de son restaurant |
| **MANAGER** | Manager | Gestion opérationnelle, statistiques |
| **STAFF_FLOOR** | Serveur salle | Commandes, réservations |
| **STAFF_BAR** | Barman | Commandes boissons |
| **STAFF_KITCHEN** | Cuisine | Commandes cuisine |

### Authentification JWT

```javascript
// Header Authorization
"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Payload JWT
{
  "id": "user_id",
  "role": "ADMIN",
  "restaurantId": "restaurant_id",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Middleware d'autorisation

```javascript
// Vérification authentification
app.use('/api/*', auth.requireAuth);

// Vérification rôle admin
app.use('/api/admin/*', auth.requireRole(['ADMIN']));

// Vérification même restaurant
app.use('/api/orders', auth.requireSameRestaurant);
```

### Rate Limiting

- **Global** : 200 req/15min (authentifié), 100 req/15min (anonyme)
- **Authentification** : 5 tentatives/15min
- **Opérations sensibles** : 10 opérations/heure

---

## ⚡ Fonctionnalités Principales

### 🔄 Système de Commandes

Le système de commandes permet la gestion complète du cycle de vie d'une commande :

**États des commandes :**
- `pending` - En attente
- `confirmed` - Confirmée
- `preparing` - En préparation
- `ready` - Prête
- `served` - Servie
- `paid` - Payée
- `cancelled` - Annulée

**Workflow typique :**
1. Client passe commande → `pending`
2. Staff confirme → `confirmed`
3. Cuisine prépare → `preparing`
4. Plat prêt → `ready`
5. Plat servi → `served`
6. Paiement → `paid`

### 📅 Système de Réservations

Gestion complète des réservations avec notifications automatiques :

**États des réservations :**
- `pending` - En attente de confirmation
- `confirmed` - Confirmée
- `seated` - Client installé
- `completed` - Terminée
- `cancelled` - Annulée
- `no_show` - Client absent

**Notifications automatiques :**
- Email de confirmation immédiat
- Rappel 24h avant (configurable)
- Email d'annulation si nécessaire

### 🗺️ Plans de Salle Interactifs

Système de gestion visuelle des tables :

**Fonctionnalités :**
- Glisser-déposer des tables
- Différentes formes (rond, carré, rectangle)
- États des tables (libre, occupée, réservée, maintenance)
- Obstacles et zones (murs, entrées, bar, cuisine)
- Export/import des plans
- Plans multiples par restaurant

### 📧 Système de Notifications

**Services email supportés :**
- **Brevo** (recommandé) - 300 emails/jour gratuits
- **Gmail** avec App Password
- **Outlook/Hotmail**
- **SMTP personnalisé**

**Types de notifications :**
- Confirmations de réservation
- Rappels automatiques
- Notifications d'annulation
- Rapports de statistiques
- Alertes système

### 📊 Analytics et Statistiques

**Métriques disponibles :**
- Chiffre d'affaires par période
- Commandes par statut
- Tables les plus populaires
- Plats les plus vendus
- Taux d'occupation
- Performance du staff
- Taux de no-show

### ⏰ Tâches Automatisées

**Jobs planifiés (si ENABLE_CRON_JOBS=true) :**
- **10h00 quotidien** - Rappels de réservation
- **02h00 quotidien** - Nettoyage des données anciennes
- **Toutes les heures** - Détection no-shows
- **Toutes les 15min** - Libération automatique des tables
- **Lundi 09h00** - Statistiques hebdomadaires

---

## 🛠️ Scripts Utilitaires

### Scripts de données

```bash
# Initialisation complète
npm run seed              # Données de base
npm run seed:complete     # Données complètes
npm run seed:menu         # Menu uniquement
npm run seed:orders       # Commandes de test
npm run seed:reservations # Réservations de test

# Nettoyage
npm run seed:clean        # Vider la base
npm run seed:reset        # Nettoyer et re-seeder
```

### Scripts de test

```bash
# Tests unitaires
npm test                  # Tests Jest
npm run test:watch        # Tests en mode watch
npm run test:coverage     # Couverture de code

# Tests API
npm run test:auth         # Test authentification
npm run test:orders       # Test commandes
npm run test:menu         # Test menu
npm run test:reservations # Test réservations
npm run test:api          # Tous les tests API
```

### Scripts de maintenance

```bash
# Debug et diagnostic
npm run debug:user        # Debug utilisateur
npm run debug:permissions # Debug permissions
npm run health           # Vérification santé API

# Sauvegarde
npm run backup:db        # Sauvegarde base de données
npm run restore:db       # Restauration base de données

# Documentation
npm run docs             # Générer documentation
```

### Scripts de développement

```bash
# Développement
npm run dev              # Mode développement (--watch)
npm run dev:legacy       # Mode développement (nodemon)
npm run dev:debug        # Mode debug avec inspector

# Qualité de code
npm run lint             # ESLint
npm run lint:fix         # Correction automatique
npm run format           # Prettier
npm run validate         # Lint + tests
```

---

## 📧 Configuration Email

### Brevo (Recommandé)

Brevo (ex-Sendinblue) offre 300 emails gratuits par jour :

```env
EMAIL_SERVICE=brevo
EMAIL_USER=votre.email@domaine.com
EMAIL_PASSWORD=votre_cle_smtp_brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
```

**Configuration Brevo :**
1. Créer un compte sur [brevo.com](https://www.brevo.com)
2. Aller dans "SMTP & API" → "SMTP"
3. Créer une clé SMTP
4. Utiliser votre email d'inscription et la clé SMTP

### Gmail

```env
EMAIL_SERVICE=gmail
EMAIL_USER=votre.email@gmail.com
EMAIL_PASSWORD=votre_app_password
```

**Configuration Gmail :**
1. Activer la validation en 2 étapes
2. Générer un "App Password" : [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Utiliser ce mot de passe de 16 caractères (pas votre mot de passe Gmail)

### Outlook

```env
EMAIL_SERVICE=outlook
EMAIL_USER=votre.email@outlook.com
EMAIL_PASSWORD=votre_mot_de_passe
```

### Test de configuration

```bash
# Test avec script intégré
node test-email.js

# Test via API
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## 🐛 Dépannage

### Problèmes Courants

#### 1. Erreur de connexion MongoDB

```
Error: MongoNetworkError: failed to connect to server
```

**Solutions :**
- Vérifier que MongoDB est démarré : `mongod`
- Vérifier l'URL dans `.env` : `MONGODB_URI`
- Tester la connexion : `mongo mongodb://localhost:27017/zengest`

#### 2. Erreur JWT malformed

```
Error: jwt malformed
```

**Solutions :**
- Vérifier `JWT_SECRET` dans `.env`
- Générer un nouveau secret : `openssl rand -base64 32`
- Redémarrer le serveur après modification

#### 3. Port déjà utilisé

```
Error: listen EADDRINUSE :::3000
```

**Solutions :**
```bash
# Trouver le processus
lsof -ti:3000

# Terminer le processus
kill -9 $(lsof -ti:3000)

# Ou changer de port
PORT=3001 npm run dev
```

#### 4. Emails non envoyés

**Vérifications :**
- Configuration email dans `.env`
- Test avec : `node test-email.js`
- Vérifier les logs serveur
- Tester avec Brevo (plus simple que Gmail)

#### 5. Erreur 500 sur /orders

```
Error: Cannot read property 'page' of undefined
```

**Solution :**
```bash
# Correction automatique
node fix-orders-controller.js

# Redémarrer le serveur
npm run dev
```

### Scripts de diagnostic

```bash
# Diagnostic complet
node diagnose-orders-fix.js      # Problèmes commandes
node debug-token.js              # Problèmes JWT
node test-all-routes.js          # Test toutes les routes

# Tests spécifiques
node test-orders-simple.js       # Test route orders
node test-email.js               # Test configuration email
node diagnostic.js               # Configuration générale
```

### Logs et Debug

**Fichiers de logs :**
- `logs/access.log` - Logs d'accès HTTP
- `logs/error.log` - Logs d'erreurs
- Console serveur - Logs en temps réel

**Mode debug :**
```bash
# Debug avec inspector Node.js
npm run dev:debug

# Puis dans Chrome : chrome://inspect
```

### Performance

**Monitoring mémoire :**
```bash
# En développement, monitoring automatique
# Alerte si > 500MB

# Vérification manuelle
node -e "console.log(process.memoryUsage())"
```

**Optimisations base de données :**
```javascript
// Index recommandés
db.orders.createIndex({ "restaurantId": 1, "status": 1 })
db.reservations.createIndex({ "restaurantId": 1, "dateTime": 1 })
db.users.createIndex({ "email": 1 }, { unique: true })
```

### Support

**En cas de problème persistant :**
1. Vérifier la documentation
2. Consulter les logs d'erreur
3. Utiliser les scripts de diagnostic
4. Contacter : [support@zengest.com](mailto:support@zengest.com)

---

## 🤝 Contribution

### Guide de développement

1. **Fork** le repository
2. **Clone** votre fork
3. **Créer** une branche feature : `git checkout -b feature/nouvelle-fonctionnalite`
4. **Installer** les dépendances : `npm install`
5. **Configurer** l'environnement : `cp .env.example .env`
6. **Seed** les données : `npm run seed`

### Standards de code

**ESLint Configuration :**
```json
{
  "extends": ["eslint:recommended", "prettier"],
  "env": { "node": true, "es2022": true },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

**Prettier Configuration :**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Tests

**Écriture de tests :**
```javascript
// Exemple test API
describe('Orders API', () => {
  beforeEach(async () => {
    await Order.deleteMany({});
  });

  test('GET /api/orders should return paginated orders', async () => {
    const response = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.orders).toBeInstanceOf(Array);
  });
});
```

**Lancer les tests :**
```bash
npm test                    # Tests unitaires
npm run test:coverage       # Avec couverture
npm run test:api           # Tests d'intégration
npm run validate           # Lint + tests
```

### Processus de commit

```bash
# Validation avant commit
npm run lint:fix           # Correction style
npm run test               # Tests unitaires
npm run validate           # Validation complète

# Commit avec message clair
git add .
git commit -m "feat: ajouter système de notifications push"
git push origin feature/notifications-push

# Créer une Pull Request
```

### Conventions de commit

- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation
- `style:` - Style/formatting
- `refactor:` - Refactoring
- `test:` - Ajout/modification tests
- `chore:` - Maintenance

### Architecture des nouvelles fonctionnalités

**Ajouter un nouveau endpoint :**

1. **Modèle** (`src/models/`) :
```javascript
const mongoose = require('mongoose');

const NewFeatureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // ... autres champs
}, { timestamps: true });

module.exports = mongoose.model('NewFeature', NewFeatureSchema);
```

2. **Contrôleur** (`src/controllers/`) :
```javascript
exports.getAllFeatures = async (req, res) => {
  try {
    const features = await NewFeature.find();
    res.json({ success: true, data: { features } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

3. **Routes** (`src/routes/`) :
```javascript
const express = require('express');
const { getAllFeatures } = require('../controllers/newFeatureController');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.get('/', auth, getAllFeatures);

module.exports = router;
```

4. **Intégration** (`app.js`) :
```javascript
const newFeatureRoutes = require('./src/routes/newFeature');
app.use('/api/new-feature', newFeatureRoutes);
```

### Documentation

**Mettre à jour la documentation :**
- README.md - Instructions générales
- Cette documentation - API endpoints
- JSDoc dans le code - Documentation inline
- Tests - Documentation par l'exemple

---

## 📞 Support et Contact

### Informations du projet

- **Repository** : [GitHub](https://github.com/zengest/backend)
- **Version** : 1.2.0
- **License** : ISC
- **Author** : Zengest Team

### Contact

- **Email** : [support@zengest.com](mailto:support@zengest.com)
- **Documentation** : [docs.zengest.com](https://docs.zengest.com)
- **API Status** : `GET /api/health`

### Ressources utiles

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [JWT.io](https://jwt.io/) - Décodeur JWT
- [Brevo Documentation](https://developers.brevo.com/)

---

**© 2025 Zengest Team - Tous droits réservés**