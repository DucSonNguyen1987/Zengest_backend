/**
 * DIAGNOSTIC COMPLET ZENGEST - VERSION ADAPTÉE
 * Analyse précise prenant en compte toutes les corrections et adaptations
 * Vérifie les nouvelles fonctionnalités : restaurant auto, formats flexibles, etc.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC COMPLET ZENGEST BACKEND - VERSION ADAPTÉE');
console.log('='.repeat(60));
console.log('🎯 Objectif: Vérifier toutes les corrections et adaptations');
console.log('🆕 Nouveau: Diagnostic des fonctionnalités avancées');
console.log('🔧 Génère des recommandations précises et testées\n');

const issues = [];
const fixes = [];
const adaptations = [];

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

const logAdaptation = (category, status, details) => {
  adaptations.push({ category, status, details });
  const icon = status === 'OK' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
  console.log(`${icon} ${category}: ${details}`);
};

// === DIAGNOSTIC DES ADAPTATIONS ===

console.log('🔍 DIAGNOSTIC DES NOUVELLES ADAPTATIONS');
console.log('-'.repeat(50));

// 1. DIAGNOSTIC: Rôles en minuscules dans User.js
(() => {
  console.log('📋 1. Vérification rôles utilisateur (minuscules)');
  const userContent = analyzeFile('src/models/User.js', 'Modèle utilisateur');
  
  if (userContent) {
    const hasLowercaseRoles = userContent.includes("'admin'") || userContent.includes("'staff_floor'");
    const hasUppercaseRoles = userContent.includes("'ADMIN'") || userContent.includes("'STAFF_FLOOR'");
    const hasRestaurantIdOptional = userContent.includes('required: false') || !userContent.includes('restaurantId') || !userContent.includes('required: true');
    
    console.log(`   🔤 Rôles en minuscules: ${hasLowercaseRoles ? 'OUI' : 'NON'}`);
    console.log(`   🔤 Rôles en MAJUSCULES (obsolètes): ${hasUppercaseRoles ? 'OUI (problème)' : 'NON'}`);
    console.log(`   🏢 RestaurantId optionnel: ${hasRestaurantIdOptional ? 'OUI' : 'NON (problème)'}`);
    
    if (hasLowercaseRoles && !hasUppercaseRoles && hasRestaurantIdOptional) {
      logAdaptation('ROLES_UTILISATEUR', 'OK', 'Rôles en minuscules, restaurantId optionnel');
    } else {
      if (hasUppercaseRoles) {
        logIssue('ROLES_MAJUSCULES', 'Rôles en majuscules détectés', 'Des rôles en MAJUSCULES persistent dans le modèle User', 'HIGH');
      }
      if (!hasRestaurantIdOptional) {
        logIssue('RESTAURANTID_REQUIS', 'RestaurantId toujours obligatoire', 'Tests échoueront car restaurantId est requis', 'HIGH');
      }
    }
  }
})();

// 2. DIAGNOSTIC: Contrôleur Restaurant complet
(() => {
  console.log('📋 2. Vérification contrôleur Restaurant');
  const restaurantContent = analyzeFile('src/controllers/restaurantController.js', 'Contrôleur Restaurant');
  
  if (restaurantContent) {
    const hasGetRestaurant = restaurantContent.includes('exports.getRestaurant');
    const hasGetRestaurantStatus = restaurantContent.includes('exports.getRestaurantStatus');
    const hasCreateRestaurant = restaurantContent.includes('exports.createRestaurant');
    const hasUpdateRestaurant = restaurantContent.includes('exports.updateRestaurant');
    const hasDeleteRestaurant = restaurantContent.includes('exports.deleteRestaurant');
    const hasGetAllRestaurants = restaurantContent.includes('exports.getAllRestaurants');
    const hasErrorHandling = restaurantContent.includes('try') && restaurantContent.includes('catch');
    const hasPermissionChecks = restaurantContent.includes('role') && restaurantContent.includes('admin');
    
    console.log(`   📋 getAllRestaurants: ${hasGetAllRestaurants ? 'OUI' : 'NON'}`);
    console.log(`   📋 getRestaurant: ${hasGetRestaurant ? 'OUI' : 'NON'}`);
    console.log(`   📊 getRestaurantStatus: ${hasGetRestaurantStatus ? 'OUI' : 'NON'}`);
    console.log(`   ➕ createRestaurant: ${hasCreateRestaurant ? 'OUI' : 'NON'}`);
    console.log(`   ✏️ updateRestaurant: ${hasUpdateRestaurant ? 'OUI' : 'NON'}`);
    console.log(`   🗑️ deleteRestaurant: ${hasDeleteRestaurant ? 'OUI' : 'NON'}`);
    console.log(`   🛡️ Gestion d'erreurs: ${hasErrorHandling ? 'OUI' : 'NON'}`);
    console.log(`   🔐 Vérifications permissions: ${hasPermissionChecks ? 'OUI' : 'NON'}`);
    
    const methodsCount = [hasGetAllRestaurants, hasGetRestaurant, hasGetRestaurantStatus, 
                         hasCreateRestaurant, hasUpdateRestaurant, hasDeleteRestaurant].filter(Boolean).length;
    
    if (methodsCount >= 5 && hasErrorHandling && hasPermissionChecks) {
      logAdaptation('CONTROLEUR_RESTAURANT', 'OK', `${methodsCount}/6 méthodes, gestion erreurs et permissions`);
    } else {
      logIssue('CONTROLEUR_RESTAURANT_INCOMPLET', 'Contrôleur Restaurant incomplet', 
               `Seulement ${methodsCount}/6 méthodes présentes`, 'HIGH');
    }
  } else {
    logIssue('CONTROLEUR_RESTAURANT_MANQUANT', 'Contrôleur Restaurant inexistant', 
             'Le fichier restaurantController.js n\'existe pas', 'CRITICAL');
  }
})();

// 3. DIAGNOSTIC: Contrôleur User avec pagination
(() => {
  console.log('📋 3. Vérification contrôleur User');
  const userControllerContent = analyzeFile('src/controllers/userController.js', 'Contrôleur User');
  
  if (userControllerContent) {
    const hasGetAllUsers = userControllerContent.includes('exports.getAllUsers');
    const hasGetUser = userControllerContent.includes('exports.getUser');
    const hasCreateUser = userControllerContent.includes('exports.createUser');
    const hasUpdateUser = userControllerContent.includes('exports.updateUser');
    const hasDeleteUser = userControllerContent.includes('exports.deleteUser');
    const hasPagination = userControllerContent.includes('pagination') || userControllerContent.includes('createPagination');
    const hasRoleValidation = userControllerContent.includes('validRoles') || userControllerContent.includes('staff_floor');
    const hasPermissionChecks = userControllerContent.includes('role') && userControllerContent.includes('admin');
    
    console.log(`   👥 getAllUsers: ${hasGetAllUsers ? 'OUI' : 'NON'}`);
    console.log(`   👤 getUser: ${hasGetUser ? 'OUI' : 'NON'}`);
    console.log(`   ➕ createUser: ${hasCreateUser ? 'OUI' : 'NON'}`);
    console.log(`   ✏️ updateUser: ${hasUpdateUser ? 'OUI' : 'NON'}`);
    console.log(`   🗑️ deleteUser: ${hasDeleteUser ? 'OUI' : 'NON'}`);
    console.log(`   📄 Pagination: ${hasPagination ? 'OUI' : 'NON'}`);
    console.log(`   🔤 Validation rôles minuscules: ${hasRoleValidation ? 'OUI' : 'NON'}`);
    console.log(`   🔐 Permissions: ${hasPermissionChecks ? 'OUI' : 'NON'}`);
    
    const methodsCount = [hasGetAllUsers, hasGetUser, hasCreateUser, hasUpdateUser, hasDeleteUser].filter(Boolean).length;
    
    if (methodsCount >= 4 && hasPagination && hasRoleValidation && hasPermissionChecks) {
      logAdaptation('CONTROLEUR_USER', 'OK', `${methodsCount}/5 méthodes, pagination et validation rôles`);
    } else {
      if (!hasPagination) {
        logIssue('USER_PAGINATION_MANQUANTE', 'Pagination manquante dans userController', 
                 'Le système de pagination n\'est pas implémenté', 'MEDIUM');
      }
      if (!hasRoleValidation) {
        logIssue('USER_ROLES_VALIDATION', 'Validation rôles obsolète', 
                 'Les rôles en minuscules ne sont pas validés', 'HIGH');
      }
    }
  } else {
    logIssue('CONTROLEUR_USER_MANQUANT', 'Contrôleur User inexistant', 
             'Le fichier userController.js n\'existe pas', 'CRITICAL');
  }
})();

// 4. DIAGNOSTIC: Gestion floorPlanId automatique dans commandes
(() => {
  console.log('📋 4. Vérification commandes - floorPlanId automatique');
  const orderContent = analyzeFile('src/controllers/orderController.js', 'Contrôleur Commandes');
  
  if (orderContent) {
    const hasCreateOrder = orderContent.includes('exports.createOrder');
    const hasFloorPlanDefault = orderContent.includes('default') && orderContent.includes('floorPlan');
    const hasFloorPlanCheck = orderContent.includes('floorPlanId') && orderContent.includes('!floorPlanId');
    const hasCustomerFlexible = orderContent.includes('customer.name') || orderContent.includes('firstName');
    const hasTableNumberHandling = orderContent.includes('tableNumber') || orderContent.includes('tableId');
    
    console.log(`   📋 createOrder: ${hasCreateOrder ? 'OUI' : 'NON'}`);
    console.log(`   🗺️ Gestion plan par défaut: ${hasFloorPlanDefault ? 'OUI' : 'NON'}`);
    console.log(`   🔍 Vérification floorPlanId: ${hasFloorPlanCheck ? 'OUI' : 'NON'}`);
    console.log(`   👤 Formats client flexibles: ${hasCustomerFlexible ? 'OUI' : 'NON'}`);
    console.log(`   🪑 Gestion table: ${hasTableNumberHandling ? 'OUI' : 'NON'}`);
    
    if (hasCreateOrder && hasFloorPlanDefault && hasFloorPlanCheck) {
      logAdaptation('COMMANDES_FLOORPLAN', 'OK', 'Gestion automatique floorPlanId par défaut');
    } else {
      logIssue('COMMANDES_FLOORPLAN_MANQUANT', 'Gestion floorPlanId automatique manquante', 
               'Les commandes sans floorPlanId ne utilisent pas le plan par défaut', 'HIGH');
    }
  }
})();

// 5. DIAGNOSTIC: Formats clients flexibles dans réservations
(() => {
  console.log('📋 5. Vérification réservations - formats clients');
  const reservationContent = analyzeFile('src/controllers/reservationController.js', 'Contrôleur Réservations');
  
  if (reservationContent) {
    const hasCreateReservation = reservationContent.includes('exports.createReservation');
    const hasNameSplitting = reservationContent.includes('customer.name') && reservationContent.includes('split');
    const hasFlexibleCustomer = reservationContent.includes('firstName') && reservationContent.includes('lastName');
    const hasNameNormalization = reservationContent.includes('normaliz') || reservationContent.includes('nameParts');
    const hasValidation = reservationContent.includes('partySize') && reservationContent.includes('dateTime');
    
    console.log(`   📋 createReservation: ${hasCreateReservation ? 'OUI' : 'NON'}`);
    console.log(`   ✂️ Splitting nom automatique: ${hasNameSplitting ? 'OUI' : 'NON'}`);
    console.log(`   👤 Formats flexibles: ${hasFlexibleCustomer ? 'OUI' : 'NON'}`);
    console.log(`   🔄 Normalisation nom: ${hasNameNormalization ? 'OUI' : 'NON'}`);
    console.log(`   ✅ Validation complète: ${hasValidation ? 'OUI' : 'NON'}`);
    
    if (hasCreateReservation && hasNameSplitting && hasFlexibleCustomer && hasNameNormalization) {
      logAdaptation('RESERVATIONS_FORMATS', 'OK', 'Formats clients flexibles (name et firstName/lastName)');
    } else {
      logIssue('RESERVATIONS_FORMATS_RIGIDES', 'Formats clients rigides', 
               'Les réservations n\'acceptent pas les formats name simples', 'HIGH');
    }
  }
})();

// 6. DIAGNOSTIC: Utilitaire pagination
(() => {
  console.log('📋 6. Vérification système pagination');
  const paginationContent = analyzeFile('src/utils/pagination.js', 'Utilitaire pagination');
  
  if (paginationContent) {
    const hasCreatePagination = paginationContent.includes('createPagination');
    const hasValidatePagination = paginationContent.includes('validatePagination');
    const hasProperStructure = paginationContent.includes('currentPage') && paginationContent.includes('totalPages');
    const hasErrorHandling = paginationContent.includes('isNaN') || paginationContent.includes('parseInt');
    
    console.log(`   📄 createPagination: ${hasCreatePagination ? 'OUI' : 'NON'}`);
    console.log(`   ✅ validatePagination: ${hasValidatePagination ? 'OUI' : 'NON'}`);
    console.log(`   📊 Structure complète: ${hasProperStructure ? 'OUI' : 'NON'}`);
    console.log(`   🛡️ Gestion erreurs: ${hasErrorHandling ? 'OUI' : 'NON'}`);
    
    if (hasCreatePagination && hasProperStructure) {
      logAdaptation('PAGINATION_UTILITAIRE', 'OK', 'Utilitaire pagination complet et fonctionnel');
    } else {
      logIssue('PAGINATION_INCOMPLETE', 'Utilitaire pagination incomplet', 
               'L\'utilitaire de pagination n\'est pas complet ou manquant', 'MEDIUM');
    }
  } else {
    logIssue('PAGINATION_MANQUANTE', 'Utilitaire pagination manquant', 
             'Le fichier src/utils/pagination.js n\'existe pas', 'HIGH');
  }
})();

// 7. DIAGNOSTIC: Routes Restaurant
(() => {
  console.log('📋 7. Vérification routes Restaurant');
  const routesContent = analyzeFile('src/routes/restaurants.js', 'Routes Restaurant');
  
  if (routesContent) {
    const hasGetRoute = routesContent.includes("router.get('/:id'") && routesContent.includes('getRestaurant');
    const hasStatusRoute = routesContent.includes("router.get('/:id/status'") && routesContent.includes('getRestaurantStatus');
    const hasListRoute = routesContent.includes("router.get('/'") && routesContent.includes('getAllRestaurants');
    const hasPostRoute = routesContent.includes("router.post('/'") && routesContent.includes('createRestaurant');
    const hasPutRoute = routesContent.includes("router.put('/:id'") && routesContent.includes('updateRestaurant');
    const hasDeleteRoute = routesContent.includes("router.delete('/:id'") && routesContent.includes('deleteRestaurant');
    const hasAuth = routesContent.includes('auth');
    
    console.log(`   🛣️ GET / (liste): ${hasListRoute ? 'OUI' : 'NON'}`);
    console.log(`   🛣️ GET /:id: ${hasGetRoute ? 'OUI' : 'NON'}`);
    console.log(`   📊 GET /:id/status: ${hasStatusRoute ? 'OUI' : 'NON'}`);
    console.log(`   ➕ POST /: ${hasPostRoute ? 'OUI' : 'NON'}`);
    console.log(`   ✏️ PUT /:id: ${hasPutRoute ? 'OUI' : 'NON'}`);
    console.log(`   🗑️ DELETE /:id: ${hasDeleteRoute ? 'OUI' : 'NON'}`);
    console.log(`   🔐 Authentification: ${hasAuth ? 'OUI' : 'NON'}`);
    
    const routesCount = [hasListRoute, hasGetRoute, hasStatusRoute, hasPostRoute, hasPutRoute, hasDeleteRoute].filter(Boolean).length;
    
    if (routesCount >= 5 && hasAuth) {
      logAdaptation('ROUTES_RESTAURANT', 'OK', `${routesCount}/6 routes avec authentification`);
    } else {
      logIssue('ROUTES_RESTAURANT_INCOMPLETES', 'Routes Restaurant incomplètes', 
               `Seulement ${routesCount}/6 routes définies`, 'HIGH');
    }
  }
})();

// 8. DIAGNOSTIC: Version app.js
(() => {
  console.log('📋 8. Vérification version app.js');
  const appContent = analyzeFile('app.js', 'Configuration Express');
  
  if (appContent) {
    const versionMatches = appContent.match(/version:\s*[^,\n}]+/g) || [];
    const hasUndefinedVersion = versionMatches.some(match => match.includes('undefined') || match.includes('config.version'));
    const hasFixedVersion = versionMatches.some(match => match.includes("'1.2.0'") || match.includes('"1.2.0"'));
    
    console.log(`   📊 Occurrences version: ${versionMatches.length}`);
    console.log(`   ❌ Versions undefined: ${hasUndefinedVersion ? 'OUI (problème)' : 'NON'}`);
    console.log(`   ✅ Versions fixes 1.2.0: ${hasFixedVersion ? 'OUI' : 'NON'}`);
    
    if (!hasUndefinedVersion && hasFixedVersion) {
      logAdaptation('VERSION_APP', 'OK', 'Version 1.2.0 fixe partout');
    } else {
      logIssue('VERSION_UNDEFINED', 'Version undefined persistante', 
               'Des versions undefined ou dynamiques persistent dans app.js', 'MEDIUM');
    }
  }
})();

// === DIAGNOSTIC PERMISSIONS OWNER ===
(() => {
  console.log('📋 9. Vérification permissions Owner');
  const authContent = analyzeFile('src/middleware/auth.js', 'Middleware auth');
  
  if (authContent) {
    const hasOwnerRole = authContent.includes('owner') || authContent.includes('OWNER');
    const hasRestaurantPerms = authContent.includes('restaurants') && (authContent.includes('read') || authContent.includes('write'));
    const hasRoleMapping = authContent.includes('role') && authContent.includes('permissions');
    
    console.log(`   🏢 Rôle owner reconnu: ${hasOwnerRole ? 'OUI' : 'NON'}`);
    console.log(`   🔐 Permissions restaurants: ${hasRestaurantPerms ? 'OUI' : 'NON'}`);
    console.log(`   🗺️ Mapping rôles/permissions: ${hasRoleMapping ? 'OUI' : 'NON'}`);
    
    if (hasOwnerRole && hasRoleMapping) {
      logAdaptation('PERMISSIONS_OWNER', 'OK', 'Owner reconnu avec permissions appropriées');
    } else {
      logIssue('PERMISSIONS_OWNER_MANQUANTES', 'Permissions Owner insuffisantes', 
               'Le rôle owner n\'a pas les permissions restaurants nécessaires', 'HIGH');
    }
  }
})();

// === DIAGNOSTIC SERVEUR ===
console.log('\n🔍 DIAGNOSTIC SERVEUR & CONFIGURATION');
console.log('-'.repeat(50));

// Vérifier package.json
(() => {
  const packageContent = analyzeFile('package.json', 'Configuration NPM');
  if (packageContent) {
    const packageData = JSON.parse(packageContent);
    console.log(`   📦 Nom: ${packageData.name}`);
    console.log(`   🏷️ Version: ${packageData.version}`);
    console.log(`   📋 Scripts: ${Object.keys(packageData.scripts || {}).length}`);
    
    const hasTestScripts = packageData.scripts && Object.keys(packageData.scripts).some(s => s.includes('test'));
    const hasSeedScripts = packageData.scripts && Object.keys(packageData.scripts).some(s => s.includes('seed'));
    
    logAdaptation('CONFIGURATION_NPM', 'OK', `Version ${packageData.version}, ${hasTestScripts ? 'tests' : 'pas de tests'}, ${hasSeedScripts ? 'seeds' : 'pas de seeds'}`);
  }
})();

// Vérifier .env
(() => {
  const envExample = readFileContent('.env.example');
  const envActual = readFileContent('.env');
  
  console.log(`   ⚙️ .env.example: ${envExample ? 'OUI' : 'NON'}`);
  console.log(`   ⚙️ .env: ${envActual ? 'OUI' : 'NON'}`);
  
  if (envActual) {
    logAdaptation('CONFIGURATION_ENV', 'OK', 'Fichier .env présent');
  } else {
    logIssue('CONFIGURATION_ENV_MANQUANT', 'Fichier .env manquant', 
             'Le fichier .env est nécessaire pour la configuration', 'CRITICAL');
  }
})();

// === RAPPORT FINAL ADAPTÉ ===
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT DE DIAGNOSTIC COMPLET ADAPTÉ');
console.log('='.repeat(60));

console.log(`🔍 Problèmes identifiés: ${issues.length}`);
console.log(`🔧 Corrections suggérées: ${fixes.length}`);
console.log(`✅ Adaptations vérifiées: ${adaptations.length}`);

// Classement par sévérité
const critical = issues.filter(i => i.severity === 'CRITICAL');
const high = issues.filter(i => i.severity === 'HIGH');
const medium = issues.filter(i => i.severity === 'MEDIUM');

// État des adaptations
const adaptationsOK = adaptations.filter(a => a.status === 'OK');
const adaptationsPartial = adaptations.filter(a => a.status === 'PARTIAL');
const adaptationsNOK = adaptations.filter(a => a.status === 'NOK');

console.log(`\n🆕 ÉTAT DES ADAPTATIONS:`)
console.log(`✅ Fonctionnelles: ${adaptationsOK.length}`);
console.log(`⚠️ Partielles: ${adaptationsPartial.length}`);
console.log(`❌ Manquantes: ${adaptationsNOK.length}`);

adaptationsOK.forEach(adaptation => {
  console.log(`   ✅ ${adaptation.category}: ${adaptation.details}`);
});

if (adaptationsPartial.length > 0) {
  console.log(`\n⚠️ ADAPTATIONS PARTIELLES:`);
  adaptationsPartial.forEach(adaptation => {
    console.log(`   ⚠️ ${adaptation.category}: ${adaptation.details}`);
  });
}

if (adaptationsNOK.length > 0) {
  console.log(`\n❌ ADAPTATIONS MANQUANTES:`);
  adaptationsNOK.forEach(adaptation => {
    console.log(`   ❌ ${adaptation.category}: ${adaptation.details}`);
  });
}

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

// Plan d'action adapté
console.log('\n🎯 PLAN D\'ACTION ADAPTÉ:');
console.log('-'.repeat(40));

if (critical.length > 0) {
  console.log('1. 🚨 PRIORITÉ ABSOLUE - Fichiers critiques manquants');
  console.log('   • Exécutez: node create-missing-controllers.js');
}

if (high.length > 0) {
  console.log('2. ❌ HAUTE PRIORITÉ - Corrections importantes');
  console.log('   • Exécutez: node fix-targeted-issues.js');
  console.log('   • Vérifiez les rôles en minuscules');
  console.log('   • Assurez-vous des formats clients flexibles');
}

if (medium.length > 0) {
  console.log('3. ⚠️ PRIORITÉ NORMALE - Améliorations');
  console.log('   • Completez la pagination');
  console.log('   • Optimisez les validations');
}

// Évaluation globale
const totalAdaptations = adaptations.length;
const successfulAdaptations = adaptationsOK.length;
const adaptationRate = totalAdaptations > 0 ? Math.round((successfulAdaptations / totalAdaptations) * 100) : 0;

console.log('\n📈 TAUX D\'ADAPTATION:');
console.log('-'.repeat(40));
console.log(`🎯 Adaptations réussies: ${successfulAdaptations}/${totalAdaptations} (${adaptationRate}%)`);
console.log(`🔧 Problèmes restants: ${issues.length}`);

if (adaptationRate >= 90 && issues.length <= 2) {
  console.log('🎉 EXCELLENT! Système entièrement adapté');
  console.log('🚀 Prêt pour test complet: node test-complete-zengest-adapted.js');
} else if (adaptationRate >= 70 && issues.length <= 5) {
  console.log('✅ BON! Adaptations largement réussies');
  console.log('🔧 Quelques corrections mineures nécessaires');
} else if (adaptationRate >= 50) {
  console.log('⚠️ MOYEN. Adaptations partielles');
  console.log('🛠️ Plusieurs corrections nécessaires');
} else {
  console.log('❌ CRITIQUE! Adaptations manquantes');
  console.log('🆘 Corrections majeures requises');
}

console.log('\n💡 PROCHAINES ÉTAPES:');
console.log('1. 🔧 Appliquez les corrections selon les priorités ci-dessus');
console.log('2. 🧪 Testez: node test-complete-zengest-adapted.js');
console.log('3. 🔄 Relancez ce diagnostic pour vérification');

console.log('\n🔬 SCRIPTS DE CORRECTION RECOMMANDÉS:');
if (critical.length > 0) {
  console.log('   node create-missing-controllers.js');
}
if (high.length > 0) {
  console.log('   node fix-targeted-issues.js');
}
if (medium.length > 0) {
  console.log('   node fix-zengest-errors.js');
}

// Sauvegarder le rapport adapté
const reportData = {
  timestamp: new Date().toISOString(),
  issues,
  fixes,
  adaptations,
  summary: {
    total: issues.length,
    critical: critical.length,
    high: high.length,
    medium: medium.length,
    adaptationRate,
    successfulAdaptations,
    totalAdaptations
  }
};

try {
  fs.writeFileSync('diagnostic-rapport-adapte.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Rapport adapté sauvegardé: diagnostic-rapport-adapte.json');
} catch (error) {
  console.log('\n⚠️ Impossible de sauvegarder le rapport JSON');
}

console.log(`\n⏰ Diagnostic adapté terminé à ${new Date().toLocaleTimeString()}`);
console.log('🎯 Utilisez ce rapport pour finaliser toutes les adaptations!');