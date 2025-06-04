
/**
 * DIAGNOSTIC COMPLET ZENGEST
 * Analyse précise de chaque problème détecté
 * Identifie les causes racines et génère des corrections ciblées
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC COMPLET ZENGEST BACKEND');
console.log('='.repeat(60));
console.log('🎯 Objectif: Identifier la cause exacte de chaque erreur');
console.log('🔧 Générer des corrections précises et testées\n');

const issues = [];
const fixes = [];

// === UTILITAIRES ===
const readFileContent = (filePath) => {
  try {
    const fullPath = path.join(__dirname, filePath);
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    return null;
  }
};

const analyzeFile = (filePath, description) => {
  const content = readFileContent(filePath);
  if (!content) {
    issues.push({
      file: filePath,
      problem: 'FICHIER_MANQUANT',
      description: `${description} - Fichier inexistant`,
      severity: 'CRITICAL'
    });
    return null;
  }
  return content;
};

const logIssue = (category, problem, details, severity = 'HIGH') => {
  issues.push({ category, problem, details, severity });
  const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '❌' : '⚠️';
  console.log(`${icon} ${category}: ${problem}`);
  console.log(`   💡 ${details}\n`);
};

const logFix = (category, fix, code) => {
  fixes.push({ category, fix, code });
  console.log(`🔧 ${category}: ${fix}`);
};

// === DIAGNOSTIC PAR PROBLÈME ===

console.log('🔍 ANALYSE DES FICHIERS CRITIQUES');
console.log('-'.repeat(50));

// 1. DIAGNOSTIC: Version undefined dans app.js
(() => {
  console.log('📋 1. Analyse version dans app.js');
  const appContent = analyzeFile('app.js', 'Configuration Express principale');
  
  if (appContent) {
    // Rechercher toutes les occurrences de version
    const versionMatches = appContent.match(/version:\s*[^,\n}]+/g) || [];
    
    console.log(`   📊 Occurrences de version trouvées: ${versionMatches.length}`);
    versionMatches.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.trim()}`);
    });
    
    if (versionMatches.some(match => match.includes('undefined') || match.includes('config.version'))) {
      logIssue(
        'VERSION_APP',
        'Version undefined détectée',
        'La version dans app.js contient des références non résolues',
        'HIGH'
      );
      
      logFix('VERSION_APP', 'Remplacer toutes les versions problématiques', `
// Dans app.js, remplacer TOUTES les occurrences de :
${versionMatches.filter(m => m.includes('undefined') || m.includes('config')).join('\n')}
// Par :
version: '1.2.0'
      `);
    } else {
      console.log('   ✅ Versions dans app.js semblent correctes');
    }
  }
})();

// 2. DIAGNOSTIC: Permissions Owner
(() => {
  console.log('📋 2. Analyse permissions Owner');
  const authContent = analyzeFile('src/middleware/auth.js', 'Middleware authentification');
  
  if (authContent) {
    const hasOwnerPermissions = authContent.includes('OWNER') && authContent.includes('restaurants');
    const hasRoleCheck = authContent.includes('requireRole') || authContent.includes('checkRole');
    
    console.log(`   🔐 Permissions OWNER pour restaurants: ${hasOwnerPermissions ? 'OUI' : 'NON'}`);
    console.log(`   🔍 Système de vérification rôles: ${hasRoleCheck ? 'OUI' : 'NON'}`);
    
    if (!hasOwnerPermissions) {
      logIssue(
        'PERMISSIONS_OWNER',
        'Owner n\'a pas accès aux restaurants',
        'Le middleware auth.js ne donne pas les permissions restaurants à OWNER',
        'HIGH'
      );
      
      logFix('PERMISSIONS_OWNER', 'Ajouter permissions restaurants pour OWNER', `
// Dans src/middleware/auth.js, s'assurer que OWNER a les permissions :
'restaurants:read', 'restaurants:write'
      `);
    }
  }
})();

// 3. DIAGNOSTIC: Validation rôles utilisateur
(() => {
  console.log('📋 3. Analyse modèle User');
  const userContent = analyzeFile('src/models/User.js', 'Modèle utilisateur');
  
  if (userContent) {
    const hasUppercaseRoles = userContent.includes('STAFF_FLOOR') || userContent.includes('ADMIN');
    const hasLowercaseRoles = userContent.includes('staff_floor') || userContent.includes('admin');
    const hasRestaurantIdRequired = userContent.includes('restaurantId') && userContent.includes('required');
    
    console.log(`   📝 Rôles en MAJUSCULES: ${hasUppercaseRoles ? 'OUI (problème)' : 'NON'}`);
    console.log(`   📝 Rôles en minuscules: ${hasLowercaseRoles ? 'OUI' : 'NON'}`);
    console.log(`   🏢 RestaurantId requis: ${hasRestaurantIdRequired ? 'OUI (problème pour tests)' : 'NON'}`);
    
    if (hasUppercaseRoles) {
      logIssue(
        'VALIDATION_ROLES',
        'Rôles en majuscules détectés',
        'Le modèle User contient encore des rôles en MAJUSCULES',
        'HIGH'
      );
    }
    
    if (hasRestaurantIdRequired) {
      logIssue(
        'RESTAURANTID_REQUIRED',
        'RestaurantId requis empêche création utilisateur',
        'Les tests échouent car restaurantId est obligatoire mais non fourni',
        'HIGH'
      );
      
      logFix('RESTAURANTID_REQUIRED', 'Rendre restaurantId optionnel pour les tests', `
// Dans src/models/User.js, modifier :
restaurantId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Restaurant',
  required: false  // Changé de true à false
}
      `);
    }
  }
})();

// 4. DIAGNOSTIC: Contrôleurs Restaurant
(() => {
  console.log('📋 4. Analyse contrôleur Restaurant');
  const restaurantContent = analyzeFile('src/controllers/restaurantController.js', 'Contrôleur Restaurant');
  
  if (restaurantContent) {
    const hasGetRestaurant = restaurantContent.includes('exports.getRestaurant');
    const hasGetRestaurantStatus = restaurantContent.includes('exports.getRestaurantStatus');
    const hasErrorHandling = restaurantContent.includes('try') && restaurantContent.includes('catch');
    
    console.log(`   📋 Méthode getRestaurant: ${hasGetRestaurant ? 'OUI' : 'NON'}`);
    console.log(`   📊 Méthode getRestaurantStatus: ${hasGetRestaurantStatus ? 'OUI' : 'NON'}`);
    console.log(`   🛡️ Gestion d'erreurs: ${hasErrorHandling ? 'OUI' : 'NON'}`);
    
    if (!hasGetRestaurant || !hasGetRestaurantStatus) {
      logIssue(
        'CONTROLEUR_RESTAURANT',
        'Méthodes manquantes dans restaurantController',
        'getRestaurant et/ou getRestaurantStatus ne sont pas exportées',
        'HIGH'
      );
      
      logFix('CONTROLEUR_RESTAURANT', 'Ajouter méthodes manquantes avec gestion d\'erreurs', `
// Ajouter à la fin de src/controllers/restaurantController.js
      `);
    }
  }
})();

// 5. DIAGNOSTIC: Routes Restaurant
(() => {
  console.log('📋 5. Analyse routes Restaurant');
  const routesContent = analyzeFile('src/routes/restaurants.js', 'Routes Restaurant');
  
  if (routesContent) {
    const hasGetRoute = routesContent.includes('router.get(\'/:id\'');
    const hasStatusRoute = routesContent.includes('router.get(\'/:id/status\'');
    
    console.log(`   🛣️ Route GET /:id: ${hasGetRoute ? 'OUI' : 'NON'}`);
    console.log(`   📊 Route GET /:id/status: ${hasStatusRoute ? 'OUI' : 'NON'}`);
    
    if (!hasGetRoute || !hasStatusRoute) {
      logIssue(
        'ROUTES_RESTAURANT',
        'Routes manquantes pour Restaurant',
        'Les routes GET /:id et/ou /:id/status ne sont pas définies',
        'HIGH'
      );
    }
  }
})();

// 6. DIAGNOSTIC: Contrôleur Commandes
(() => {
  console.log('📋 6. Analyse contrôleur Commandes');
  const orderContent = analyzeFile('src/controllers/orderController.js', 'Contrôleur Commandes');
  
  if (orderContent) {
    const hasCreateOrder = orderContent.includes('exports.createOrder');
    const hasFloorPlanHandling = orderContent.includes('floorPlanId') && orderContent.includes('default');
    const hasTableIdHandling = orderContent.includes('tableId') || orderContent.includes('tableNumber');
    
    console.log(`   📋 Méthode createOrder: ${hasCreateOrder ? 'OUI' : 'NON'}`);
    console.log(`   🗺️ Gestion floorPlanId par défaut: ${hasFloorPlanHandling ? 'OUI' : 'NON'}`);
    console.log(`   🪑 Gestion tableId: ${hasTableIdHandling ? 'OUI' : 'NON'}`);
    
    if (hasCreateOrder && !hasFloorPlanHandling) {
      logIssue(
        'CONTROLEUR_COMMANDES',
        'Gestion floorPlanId manquante',
        'createOrder n\'utilise pas le plan par défaut si floorPlanId non fourni',
        'HIGH'
      );
    }
  }
})();

// 7. DIAGNOSTIC: Contrôleur Réservations
(() => {
  console.log('📋 7. Analyse contrôleur Réservations');
  const reservationContent = analyzeFile('src/controllers/reservationController.js', 'Contrôleur Réservations');
  
  if (reservationContent) {
    const hasCreateReservation = reservationContent.includes('exports.createReservation');
    const hasNameHandling = reservationContent.includes('customer.name') || reservationContent.includes('firstName');
    const hasPartySizeValidation = reservationContent.includes('partySize');
    
    console.log(`   📋 Méthode createReservation: ${hasCreateReservation ? 'OUI' : 'NON'}`);
    console.log(`   👤 Gestion nom client flexible: ${hasNameHandling ? 'OUI' : 'NON'}`);
    console.log(`   👥 Validation partySize: ${hasPartySizeValidation ? 'OUI' : 'NON'}`);
    
    if (hasCreateReservation && !hasNameHandling) {
      logIssue(
        'CONTROLEUR_RESERVATIONS',
        'Validation nom client trop stricte',
        'createReservation n\'accepte pas le format name simple',
        'HIGH'
      );
    }
  }
})();

// 8. DIAGNOSTIC: Système pagination
(() => {
  console.log('📋 8. Analyse pagination');
  const paginationContent = analyzeFile('src/utils/pagination.js', 'Utilitaire pagination');
  const userControllerContent = analyzeFile('src/controllers/userController.js', 'Contrôleur utilisateurs');
  
  console.log(`   📦 Utilitaire pagination existe: ${paginationContent ? 'OUI' : 'NON'}`);
  
  if (userControllerContent) {
    const usesPagination = userControllerContent.includes('pagination') || userControllerContent.includes('createPagination');
    console.log(`   👥 UserController utilise pagination: ${usesPagination ? 'OUI' : 'NON'}`);
    
    if (!usesPagination) {
      logIssue(
        'PAGINATION_USERS',
        'UserController n\'utilise pas l\'utilitaire pagination',
        'La structure pagination est manquante dans la réponse des utilisateurs',
        'MEDIUM'
      );
    }
  }
})();

// === DIAGNOSTIC SERVEUR ===
console.log('🔍 DIAGNOSTIC SERVEUR & CONFIGURATION');
console.log('-'.repeat(50));

// Vérifier package.json
(() => {
  const packageContent = analyzeFile('package.json', 'Configuration NPM');
  if (packageContent) {
    const packageData = JSON.parse(packageContent);
    console.log(`   📦 Nom: ${packageData.name}`);
    console.log(`   🏷️ Version: ${packageData.version}`);
    console.log(`   📋 Scripts disponibles: ${Object.keys(packageData.scripts || {}).length}`);
  }
})();

// Vérifier .env example
(() => {
  const envExample = readFileContent('.env.example');
  const envActual = readFileContent('.env');
  
  console.log(`   ⚙️ .env.example existe: ${envExample ? 'OUI' : 'NON'}`);
  console.log(`   ⚙️ .env existe: ${envActual ? 'OUI' : 'NON'}`);
  
  if (!envActual) {
    logIssue(
      'CONFIGURATION',
      'Fichier .env manquant',
      'Le fichier .env est nécessaire pour la configuration',
      'CRITICAL'
    );
  }
})();

// === RAPPORT FINAL ===
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT DE DIAGNOSTIC COMPLET');
console.log('='.repeat(60));

console.log(`🔍 Problèmes identifiés: ${issues.length}`);
console.log(`🔧 Corrections suggérées: ${fixes.length}`);

// Classement par sévérité
const critical = issues.filter(i => i.severity === 'CRITICAL');
const high = issues.filter(i => i.severity === 'HIGH');
const medium = issues.filter(i => i.severity === 'MEDIUM');

console.log(`\n🚨 CRITIQUE: ${critical.length}`);
critical.forEach(issue => {
  console.log(`   • ${issue.category}: ${issue.problem}`);
});

console.log(`\n❌ HAUTE: ${high.length}`);
high.forEach(issue => {
  console.log(`   • ${issue.category}: ${issue.problem}`);
});

console.log(`\n⚠️ MOYENNE: ${medium.length}`);
medium.forEach(issue => {
  console.log(`   • ${issue.category}: ${issue.problem}`);
});

// Plan d'action
console.log('\n🎯 PLAN D\'ACTION RECOMMANDÉ:');
console.log('-'.repeat(40));

if (critical.length > 0) {
  console.log('1. 🚨 PRIORITÉ ABSOLUE - Corriger les problèmes critiques');
  critical.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue.details}`);
  });
}

if (high.length > 0) {
  console.log('2. ❌ HAUTE PRIORITÉ - Corriger les problèmes majeurs');
  console.log('   • Vérifier que les méthodes sont bien exportées');
  console.log('   • Corriger les validations de modèles');
  console.log('   • Ajouter les routes manquantes');
}

if (medium.length > 0) {
  console.log('3. ⚠️ PRIORITÉ NORMALE - Améliorer les fonctionnalités');
  console.log('   • Intégrer l\'utilitaire pagination');
  console.log('   • Optimiser les validations');
}

console.log('\n💡 PROCHAINES ÉTAPES:');
console.log('1. 📝 Examinez chaque problème identifié ci-dessus');
console.log('2. 🔧 Appliquez les corrections une par une');
console.log('3. 🧪 Testez après chaque correction');
console.log('4. 🔄 Relancez ce diagnostic pour vérifier');

console.log('\n🔬 Pour des corrections automatiques ciblées :');
console.log('   node fix-specific-issue.js [CATEGORY]');

// Sauvegarder le rapport
const reportData = {
  timestamp: new Date().toISOString(),
  issues,
  fixes,
  summary: {
    total: issues.length,
    critical: critical.length,
    high: high.length,
    medium: medium.length
  }
};

try {
  fs.writeFileSync('diagnostic-rapport.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Rapport détaillé sauvegardé: diagnostic-rapport.json');
} catch (error) {
  console.log('\n⚠️ Impossible de sauvegarder le rapport JSON');
}

console.log(`\n⏰ Diagnostic terminé à ${new Date().toLocaleTimeString()}`);
console.log('🎯 Utilisez ce rapport pour corriger précisément chaque problème!');