
/**
 * Test de validation post-corrections
 * Script de test ciblé pour valider les corrections appliquées
 * Objectif: Vérifier que le taux de réussite atteint 95%+
 */

console.log('🧪 TEST DE VALIDATION POST-CORRECTIONS');
console.log('='.repeat(60));
console.log('🎯 Objectif: Valider les 8 corrections appliquées');
console.log('📈 Taux cible: 95%+ de réussite\n');

const API_BASE = 'http://localhost:3000/api';

// Comptes de test
const TEST_ACCOUNTS = {
  admin: { email: 'admin@zengest.com', password: 'Admin123!' },
  owner: { email: 'owner@bistrot-zengest.com', password: 'Owner123!' },
  manager: { email: 'manager@bistrot-zengest.com', password: 'Manager123!' }
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  corrections: [],
  tokens: {}
};

// Utilitaires
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers }
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  let responseData;
  try {
    responseData = await response.json();
  } catch {
    responseData = { rawResponse: await response.text() };
  }

  return {
    status: response.status,
    ok: response.ok,
    data: responseData
  };
};

const logTest = (testName, success, details = '') => {
  testResults.total++;
  const status = success ? '✅' : '❌';
  
  if (success) {
    testResults.passed++;
    console.log(`${status} ${testName}`);
    if (details) console.log(`   💡 ${details}`);
    testResults.corrections.push({ test: testName, status: 'FIXED', details });
  } else {
    testResults.failed++;
    console.log(`${status} ${testName}`);
    if (details) console.log(`   ❌ ${details}`);
    testResults.corrections.push({ test: testName, status: 'STILL_BROKEN', details });
  }
};

// === TESTS CIBLÉS POUR CHAQUE CORRECTION ===

// Test 1: Route racine - version undefined
const testRootRouteFixed = async () => {
  console.log('\n📋 TEST 1: Route racine (version)');
  console.log('-'.repeat(40));
  
  try {
    const response = await makeRequest('GET', '/');
    const hasVersion = response.data.version && response.data.version !== 'undefined';
    
    logTest(
      'Version racine définie',
      hasVersion,
      hasVersion ? `Version: ${response.data.version}` : 'Version toujours undefined'
    );
    
  } catch (error) {
    logTest('Route racine', false, error.message);
  }
};

// Test 2: Permissions Owner pour restaurants
const testOwnerPermissionsFixed = async () => {
  console.log('\n📋 TEST 2: Permissions Owner');
  console.log('-'.repeat(40));
  
  try {
    // Connexion owner
    const loginResponse = await makeRequest('POST', '/auth/login', TEST_ACCOUNTS.owner);
    
    if (loginResponse.ok) {
      testResults.tokens.owner = loginResponse.data.data.token;
      
      // Test accès restaurants
      const restaurantResponse = await makeRequest('GET', '/restaurants', null, {
        'Authorization': `Bearer ${testResults.tokens.owner}`
      });
      
      logTest(
        'Owner accès restaurants',
        restaurantResponse.ok,
        restaurantResponse.ok ? 'Accès autorisé' : `Status: ${restaurantResponse.status}`
      );
      
    } else {
      logTest('Connexion Owner', false, 'Impossible de se connecter');
    }
    
  } catch (error) {
    logTest('Permissions Owner', false, error.message);
  }
};

// Test 3: Validation rôles utilisateur
const testUserRoleValidationFixed = async () => {
  console.log('\n📋 TEST 3: Validation rôles utilisateur');
  console.log('-'.repeat(40));
  
  try {
    // Connexion admin
    const loginResponse = await makeRequest('POST', '/auth/login', TEST_ACCOUNTS.admin);
    
    if (loginResponse.ok) {
      testResults.tokens.admin = loginResponse.data.data.token;
      
      // Test création utilisateur avec nouveau format de rôle
      const newUser = {
        firstName: 'Test',
        lastName: 'User',
        email: `test.${Date.now()}@zengest.com`,
        password: 'Test123!',
        role: 'staff_floor', // Format en minuscules
        phone: '+33123456789'
      };

      const createResponse = await makeRequest('POST', '/users', newUser, {
        'Authorization': `Bearer ${testResults.tokens.admin}`
      });
      
      logTest(
        'Création utilisateur (rôle minuscule)',
        createResponse.ok,
        createResponse.ok ? 'Utilisateur créé' : createResponse.data.message
      );
      
      // Nettoyer - supprimer l'utilisateur test
      if (createResponse.ok) {
        const userId = createResponse.data.data.user.id;
        await makeRequest('DELETE', `/users/${userId}`, null, {
          'Authorization': `Bearer ${testResults.tokens.admin}`
        });
      }
      
    } else {
      logTest('Connexion Admin', false, 'Impossible de se connecter');
    }
    
  } catch (error) {
    logTest('Validation rôles', false, error.message);
  }
};

// Test 4 & 5: Restaurant Controller
const testRestaurantControllerFixed = async () => {
  console.log('\n📋 TEST 4 & 5: Contrôleur Restaurant');
  console.log('-'.repeat(40));
  
  try {
    const adminToken = testResults.tokens.admin;
    if (!adminToken) {
      logTest('Token admin requis', false, 'Connexion admin échouée');
      return;
    }

    // Test liste restaurants
    const listResponse = await makeRequest('GET', '/restaurants', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (listResponse.ok && listResponse.data.data.restaurants.length > 0) {
      const restaurant = listResponse.data.data.restaurants[0];
      
      // Test détails restaurant
      const detailResponse = await makeRequest('GET', `/restaurants/${restaurant.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      
      logTest(
        'Détails restaurant',
        detailResponse.ok,
        detailResponse.ok ? `Restaurant: ${restaurant.name}` : detailResponse.data.message
      );
      
      // Test statut restaurant
      const statusResponse = await makeRequest('GET', `/restaurants/${restaurant.id}/status`);
      
      logTest(
        'Statut restaurant',
        statusResponse.ok,
        statusResponse.ok ? 'Statut récupéré' : statusResponse.data.message
      );
      
    } else {
      logTest('Liste restaurants', false, 'Aucun restaurant trouvé');
    }
    
  } catch (error) {
    logTest('Contrôleur Restaurant', false, error.message);
  }
};

// Test 6: Création commande avec floorPlanId
const testOrderCreationFixed = async () => {
  console.log('\n📋 TEST 6: Création commande');
  console.log('-'.repeat(40));
  
  try {
    // Connexion staff
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: 'sophie.salle@bistrot-zengest.com',
      password: 'Staff123!'
    });
    
    if (loginResponse.ok) {
      const staffToken = loginResponse.data.data.token;
      
      // Récupérer un élément du menu
      const menuResponse = await makeRequest('GET', '/menu?limit=1', null, {
        'Authorization': `Bearer ${staffToken}`
      });
      
      if (menuResponse.ok && menuResponse.data.data.menuItems.length > 0) {
        const menuItem = menuResponse.data.data.menuItems[0];
        
        // Test création commande SANS floorPlanId (doit utiliser le défaut)
        const newOrder = {
          tableNumber: '999',
          customer: {
            name: 'Client Test Post-Correction' // Format simplifié
          },
          items: [{
            menuItem: menuItem.id,
            quantity: 1,
            price: menuItem.basePrice || 10
          }]
          // PAS de floorPlanId - doit être géré automatiquement
        };

        const createResponse = await makeRequest('POST', '/orders', newOrder, {
          'Authorization': `Bearer ${staffToken}`
        });
        
        logTest(
          'Création commande sans floorPlanId',
          createResponse.ok,
          createResponse.ok ? 'Commande créée (plan par défaut)' : createResponse.data.message
        );
        
        // Test avec floorPlanId explicite
        const floorPlanResponse = await makeRequest('GET', '/floor-plans/default', null, {
          'Authorization': `Bearer ${staffToken}`
        });
        
        if (floorPlanResponse.ok) {
          const newOrderWithPlan = {
            ...newOrder,
            floorPlanId: floorPlanResponse.data.data.floorPlan.id,
            tableNumber: '998'
          };
          
          const createResponse2 = await makeRequest('POST', '/orders', newOrderWithPlan, {
            'Authorization': `Bearer ${staffToken}`
          });
          
          logTest(
            'Création commande avec floorPlanId',
            createResponse2.ok,
            createResponse2.ok ? 'Commande créée (plan explicite)' : createResponse2.data.message
          );
        }
        
      } else {
        logTest('Menu requis', false, 'Aucun élément menu trouvé');
      }
      
    } else {
      logTest('Connexion Staff', false, 'Impossible de se connecter');
    }
    
  } catch (error) {
    logTest('Création commandes', false, error.message);
  }
};

// Test 7: Création réservation avec nom client
const testReservationCreationFixed = async () => {
  console.log('\n📋 TEST 7: Création réservation');
  console.log('-'.repeat(40));
  
  try {
    // Connexion manager
    const loginResponse = await makeRequest('POST', '/auth/login', TEST_ACCOUNTS.manager);
    
    if (loginResponse.ok) {
      const managerToken = loginResponse.data.data.token;
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0);

      // Test avec firstName/lastName
      const reservation1 = {
        customer: {
          firstName: 'Test',
          lastName: 'Reservation',
          email: 'test.reservation@example.com',
          phone: '+33123456789'
        },
        dateTime: tomorrow.toISOString(),
        partySize: 4
      };

      const createResponse1 = await makeRequest('POST', '/reservations', reservation1, {
        'Authorization': `Bearer ${managerToken}`
      });
      
      logTest(
        'Réservation avec firstName/lastName',
        createResponse1.ok,
        createResponse1.ok ? 'Réservation créée' : createResponse1.data.message
      );
      
      // Test avec name simple
      const reservation2 = {
        customer: {
          name: 'Jean Dupont Test', // Format nom simple
          email: 'jean.test@example.com',
          phone: '+33123456789'
        },
        dateTime: new Date(tomorrow.getTime() + 3600000).toISOString(), // +1h
        partySize: 2
      };

      const createResponse2 = await makeRequest('POST', '/reservations', reservation2, {
        'Authorization': `Bearer ${managerToken}`
      });
      
      logTest(
        'Réservation avec name simple',
        createResponse2.ok,
        createResponse2.ok ? 'Réservation créée (nom splitté)' : createResponse2.data.message
      );
      
    } else {
      logTest('Connexion Manager', false, 'Impossible de se connecter');
    }
    
  } catch (error) {
    logTest('Création réservations', false, error.message);
  }
};

// Test 8: Système pagination
const testPaginationSystemFixed = async () => {
  console.log('\n📋 TEST 8: Système pagination');
  console.log('-'.repeat(40));
  
  try {
    const adminToken = testResults.tokens.admin;
    if (!adminToken) {
      logTest('Token admin requis', false, 'Connexion admin échouée');
      return;
    }

    // Test pagination sur plusieurs endpoints
    const endpoints = [
      { url: '/users?page=1&limit=5', name: 'Utilisateurs' },
      { url: '/menu?page=1&limit=3', name: 'Menu' },
      { url: '/orders?page=1&limit=5', name: 'Commandes' },
      { url: '/reservations?page=1&limit=5', name: 'Réservations' }
    ];

    for (const endpoint of endpoints) {
      const response = await makeRequest('GET', endpoint.url, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      
      const hasPagination = response.ok && 
                           response.data.data && 
                           response.data.data.pagination &&
                           typeof response.data.data.pagination.currentPage === 'number';
      
      logTest(
        `Pagination ${endpoint.name}`,
        hasPagination,
        hasPagination ? 
          `Page ${response.data.data.pagination.currentPage}/${response.data.data.pagination.totalPages}` : 
          'Structure pagination manquante'
      );
    }
    
    // Test paramètres pagination invalides
    const invalidResponse = await makeRequest('GET', '/users?page=abc&limit=xyz', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    logTest(
      'Validation paramètres pagination',
      !invalidResponse.ok && invalidResponse.status === 400,
      invalidResponse.status === 400 ? 'Paramètres invalides rejetés' : 'Validation manquante'
    );
    
  } catch (error) {
    logTest('Système pagination', false, error.message);
  }
};

// === FONCTION PRINCIPALE ===
const runValidationTests = async () => {
  console.log('🚀 Démarrage des tests de validation...\n');
  
  try {
    // Vérification serveur accessible
    const healthResponse = await makeRequest('GET', '/health');
    if (!healthResponse.ok) {
      console.error('❌ Serveur non accessible. Démarrez le serveur: npm run dev');
      return;
    }
    
    console.log('✅ Serveur accessible\n');
    
    // Tests des corrections
    await testRootRouteFixed();
    await testOwnerPermissionsFixed();
    await testUserRoleValidationFixed();
    await testRestaurantControllerFixed();
    await testOrderCreationFixed();
    await testReservationCreationFixed();
    await testPaginationSystemFixed();
    
    // Rapport final
    generateValidationReport();
    
  } catch (error) {
    console.error('\n💥 ERREUR FATALE:', error.message);
  }
};

const generateValidationReport = () => {
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT DE VALIDATION POST-CORRECTIONS');
  console.log('='.repeat(60));
  
  console.log(`📋 Tests de validation: ${testResults.total}`);
  console.log(`✅ Corrections validées: ${testResults.passed}`);
  console.log(`❌ Corrections échouées: ${testResults.failed}`);
  console.log(`📈 Taux de correction: ${successRate}%`);
  
  // Analyse par correction
  console.log('\n📋 DÉTAIL DES CORRECTIONS:');
  console.log('-'.repeat(40));
  
  const fixedCount = testResults.corrections.filter(c => c.status === 'FIXED').length;
  const brokenCount = testResults.corrections.filter(c => c.status === 'STILL_BROKEN').length;
  
  testResults.corrections.forEach((correction, index) => {
    const status = correction.status === 'FIXED' ? '✅' : '❌';
    console.log(`${status} ${correction.test}`);
    if (correction.details) {
      console.log(`   💡 ${correction.details}`);
    }
  });
  
  // Évaluation globale
  console.log('\n🎯 ÉVALUATION GLOBALE:');
  console.log('-'.repeat(40));
  
  if (successRate >= 95) {
    console.log('🎉 PARFAIT! Toutes les corrections ont été appliquées avec succès');
    console.log('🚀 Votre backend Zengest est maintenant entièrement fonctionnel');
    console.log('💯 Taux de réussite attendu au test complet: 98%+');
  } else if (successRate >= 80) {
    console.log('✅ EXCELLENT! La plupart des corrections fonctionnent');
    console.log('🔧 Quelques ajustements mineurs peuvent être nécessaires');
    console.log('📈 Taux de réussite attendu au test complet: 90-95%');
  } else if (successRate >= 60) {
    console.log('⚠️ MOYEN. Certaines corrections nécessitent plus de travail');
    console.log('🔍 Vérifiez les erreurs restantes ci-dessus');
    console.log('📊 Taux de réussite attendu au test complet: 85-90%');
  } else {
    console.log('❌ PROBLÉMATIQUE. Beaucoup de corrections ont échoué');
    console.log('🛠️ Correction manuelle nécessaire');
    console.log('📉 Taux de réussite attendu: <85%');
  }
  
  // Prochaines étapes
  console.log('\n🔄 PROCHAINES ÉTAPES:');
  console.log('-'.repeat(40));
  
  if (successRate >= 90) {
    console.log('1. 🧪 Relancez le test complet: node test-complete-zengest.js');
    console.log('2. 🎯 Vérifiez que vous atteignez 95%+ de réussite');
    console.log('3. 🚀 Votre backend est prêt pour la production!');
  } else {
    console.log('1. 🔍 Examinez les erreurs restantes ci-dessus');
    console.log('2. 🔧 Appliquez les corrections manuelles nécessaires');
    console.log('3. 🔄 Relancez ce test de validation');
    console.log('4. 🧪 Puis relancez le test complet');
  }
  
  console.log('\n📚 RESSOURCES:');
  console.log('-'.repeat(40));
  console.log('📖 Documentation: README.md');
  console.log('🔧 Scripts disponibles: npm run (voir package.json)');
  console.log('🆘 Support: support@zengest.com');
  
  console.log(`\n⏰ Validation terminée à ${new Date().toLocaleTimeString()}`);
  
  // Message d'encouragement
  if (fixedCount > brokenCount) {
    console.log('🎉 Bravo! Vous avez fait d\'excellents progrès!');
  } else if (fixedCount === brokenCount) {
    console.log('💪 Continuez! Vous êtes sur la bonne voie!');
  } else {
    console.log('🚀 Ne vous découragez pas! Chaque correction vous rapproche du succès!');
  }
};

// === DÉMARRAGE ===
console.log('🔍 Vérification environnement...');

if (typeof fetch === 'undefined') {
  console.error('❌ fetch non disponible. Node.js 18+ requis');
  process.exit(1);
}

console.log('✅ Environnement compatible\n');

runValidationTests().catch(error => {
  console.error('\n💥 ÉCHEC CRITIQUE:', error.message);
  process.exit(1);
});