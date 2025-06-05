/**
 * VÉRIFICATION STRUCTURE FICHIERS ZENGEST
 * Script pour vérifier que tous les fichiers nécessaires existent
 */

const fs = require('fs');
const path = require('path');

console.log('📁 VÉRIFICATION STRUCTURE FICHIERS ZENGEST');
console.log('='.repeat(50));

const checkFile = (filePath, description) => {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  const icon = exists ? '✅' : '❌';
  
  console.log(`${icon} ${filePath} - ${description}`);
  
  if (exists) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`   📏 ${lines} lignes`);
      
      // Vérifications spécifiques
      if (filePath.includes('routes/auth.js')) {
        const hasLogin = content.includes('login');
        const hasRegister = content.includes('register');
        const hasGetMe = content.includes('getMe');
        console.log(`   🔍 login: ${hasLogin ? '✅' : '❌'}, register: ${hasRegister ? '✅' : '❌'}, getMe: ${hasGetMe ? '✅' : '❌'}`);
      }
      
      if (filePath.includes('controllers/authController.js')) {
        const hasExportsLogin = content.includes('exports.login');
        const hasExportsRegister = content.includes('exports.register');
        const hasExportsGetMe = content.includes('exports.getMe');
        console.log(`   🔍 exports.login: ${hasExportsLogin ? '✅' : '❌'}, exports.register: ${hasExportsRegister ? '✅' : '❌'}, exports.getMe: ${hasExportsGetMe ? '✅' : '❌'}`);
      }
      
      if (filePath === 'app.js') {
        const hasAuthRoutes = content.includes('authRoutes') || content.includes('/auth');
        const hasRequireAuth = content.includes("require('./src/routes/auth')");
        console.log(`   🔍 authRoutes: ${hasAuthRoutes ? '✅' : '❌'}, require auth: ${hasRequireAuth ? '✅' : '❌'}`);
        
        // Vérifier si la route est montée
        const authMounted = content.includes("app.use('/api/auth'") || content.includes('app.use("/api/auth"');
        console.log(`   🔍 route montée: ${authMounted ? '✅' : '❌'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur lecture: ${error.message}`);
    }
  }
  
  return exists;
};

console.log('\n📋 FICHIERS PRINCIPAUX:');
console.log('-'.repeat(30));

const mainFiles = [
  ['package.json', 'Configuration npm'],
  ['app.js', 'Configuration Express'],
  ['server.js', 'Point d\'entrée'],
  ['.env', 'Variables d\'environnement'],
];

mainFiles.forEach(([file, desc]) => checkFile(file, desc));

console.log('\n📋 ROUTES:');
console.log('-'.repeat(30));

const routeFiles = [
  ['src/routes/auth.js', 'Routes authentification'],
  ['src/routes/users.js', 'Routes utilisateurs'],
  ['src/routes/restaurants.js', 'Routes restaurants'],
  ['src/routes/orders.js', 'Routes commandes'],
  ['src/routes/menu.js', 'Routes menu'],
  ['src/routes/reservations.js', 'Routes réservations'],
  ['src/routes/floorplans.js', 'Routes plans de salle'],
  ['src/routes/notifications.js', 'Routes notifications']
];

routeFiles.forEach(([file, desc]) => checkFile(file, desc));

console.log('\n📋 CONTRÔLEURS:');
console.log('-'.repeat(30));

const controllerFiles = [
  ['src/controllers/authController.js', 'Contrôleur authentification'],
  ['src/controllers/userController.js', 'Contrôleur utilisateurs'],
  ['src/controllers/restaurantController.js', 'Contrôleur restaurants'],
  ['src/controllers/orderController.js', 'Contrôleur commandes'],
  ['src/controllers/menuController.js', 'Contrôleur menu'],
  ['src/controllers/reservationController.js', 'Contrôleur réservations']
];

controllerFiles.forEach(([file, desc]) => checkFile(file, desc));

console.log('\n📋 MODÈLES:');
console.log('-'.repeat(30));

const modelFiles = [
  ['src/models/User.js', 'Modèle utilisateur'],
  ['src/models/Restaurant.js', 'Modèle restaurant'],
  ['src/models/Order.js', 'Modèle commande'],
  ['src/models/Menu.js', 'Modèle menu'],
  ['src/models/Reservation.js', 'Modèle réservation'],
  ['src/models/FloorPlan.js', 'Modèle plan de salle']
];

modelFiles.forEach(([file, desc]) => checkFile(file, desc));

console.log('\n📋 MIDDLEWARE:');
console.log('-'.repeat(30));

const middlewareFiles = [
  ['src/middleware/auth.js', 'Middleware authentification'],
  ['src/middleware/roleCheck.js', 'Middleware vérification rôles'],
  ['src/middleware/orderValidation.js', 'Middleware validation commandes']
];

middlewareFiles.forEach(([file, desc]) => checkFile(file, desc));

console.log('\n📋 CONFIGURATION:');
console.log('-'.repeat(30));

const configFiles = [
  ['src/config/config.js', 'Configuration générale'],
  ['src/config/database.js', 'Configuration base de données'],
  ['src/utils/constants.js', 'Constantes système'],
  ['src/utils/pagination.js', 'Utilitaire pagination']
];

configFiles.forEach(([file, desc]) => checkFile(file, desc));

// === VÉRIFICATION APP.JS SPÉCIFIQUE ===
console.log('\n📋 ANALYSE APP.JS DÉTAILLÉE:');
console.log('-'.repeat(30));

try {
  const appPath = path.join(__dirname, 'app.js');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    console.log('🔍 Recherche des imports de routes...');
    
    const routeImports = [
      'authRoutes',
      'userRoutes', 
      'restaurantRoutes',
      'orderRoutes',
      'menuRoutes',
      'reservationRoutes',
      'floorPlanRoutes',
      'notificationRoutes'
    ];
    
    routeImports.forEach(routeName => {
      const hasImport = appContent.includes(routeName);
      console.log(`   ${hasImport ? '✅' : '❌'} ${routeName}`);
    });
    
    console.log('\n🔍 Recherche du montage des routes...');
    
    const routeMounts = [
      "app.use('/api/auth'",
      "app.use('/api/users'",
      "app.use('/api/restaurants'",
      "app.use('/api/orders'",
      "app.use('/api/menu'",
      "app.use('/api/reservations'",
      "app.use('/api/floor-plans'",
      "app.use('/api/notifications'"
    ];
    
    routeMounts.forEach(mount => {
      const hasMounted = appContent.includes(mount);
      console.log(`   ${hasMounted ? '✅' : '❌'} ${mount}`);
    });
    
  }
} catch (error) {
  console.log('❌ Erreur analyse app.js:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('📊 RECOMMANDATIONS:');
console.log('='.repeat(50));

console.log('1. ✅ Si tous les fichiers auth sont présents → Redémarrez le serveur');
console.log('2. ❌ Si authController.js manque → Créez-le avec le contenu fourni');
console.log('3. ❌ Si auth.js routes manque → Créez-le avec le contenu fourni');
console.log('4. ❌ Si routes non montées dans app.js → Ajoutez les lignes manquantes');
console.log('5. 🔄 Après corrections → Relancez: npm run dev');
console.log('6. 🧪 Puis testez: node quick-validation-test.js');

console.log('\n💡 LIGNE À AJOUTER DANS APP.JS SI MANQUANTE:');
console.log("const authRoutes = require('./src/routes/auth');");
console.log("app.use('/api/auth', authRoutes);");

console.log(`\n⏰ Vérification terminée à ${new Date().toLocaleTimeString()}`);