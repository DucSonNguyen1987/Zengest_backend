/**
 * TEST DE VALIDATION RAPIDE POST-CORRECTIONS
 * Script simple pour valider que toutes les corrections fonctionnent
 * À exécuter avec: node quick-validation-test.js
 */

console.log('🔧 TEST DE VALIDATION RAPIDE - POST CORRECTIONS');
console.log('='.repeat(50));
console.log('🎯 Objectif: Valider que toutes les corrections sont effectives\n');

const API_BASE = 'http://localhost:3000/api';

// === FONCTION DE TEST ===
const testEndpoint = async (method, endpoint, data = null, token = null, expectedStatus = 200) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const responseData = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = { rawResponse: responseData };
    }

    const success = expectedStatus === 'any' ? true : response.status === expectedStatus;
    const icon = success ? '✅' : '❌';
    
    console.log(`${icon} ${method} ${endpoint} - Status: ${response.status}`);
    
    if (!success) {
      console.log(`   ❌ Attendu: ${expectedStatus}, Reçu: ${response.status}`);
      if (parsedData.message) {
        console.log(`   💬 Message: ${parsedData.message}`);
      }
    }
    
    return { response, data: parsedData, success };
    
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Erreur: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// === TESTS PRINCIPAUX ===
const runQuickValidation = async () => {
  console.log('🚀 Démarrage des tests de validation...\n');
  
  let adminToken = null;
  let ownerToken = null;
  let staffToken = null;
  
  // === TEST 1: SANTÉ DU SERVEUR ===
  console.log('📋 1. Tests de base');
  console.log('-'.repeat(30));
  
  await testEndpoint('GET', '/health');
  await testEndpoint('GET', '/docs');
  await testEndpoint('GET', '/');
  
  // === TEST 2: AUTHENTIFICATION ===
  console.log('\n📋 2. Authentification');
  console.log('-'.repeat(30));
  
  // Connexion admin
  const adminLogin = await testEndpoint('POST', '/auth/login', {
    email: 'admin@zengest.com',
    password: 'Admin123!'
  });
  
  if (adminLogin.success && adminLogin.data.success) {
    adminToken = adminLogin.data.data.token;
    console.log('   🔑 Token admin obtenu');
  }
  
  // Connexion owner
  const ownerLogin = await testEndpoint('POST', '/auth/login', {
    email: 'owner@bistrot-zengest.com',
    password: 'Owner123!'
  });
  
  if (ownerLogin.success && ownerLogin.data.success) {
    ownerToken = ownerLogin.data.data.token;
    console.log('   🔑 Token owner obtenu');
  }
  
  // Connexion staff
  const staffLogin = await testEndpoint('POST', '/auth/login', {
    email: 'sophie.salle@bistrot-zengest.com',
    password: 'Staff123!'
  });
  
  if (staffLogin.success && staffLogin.data.success) {
    staffToken = staffLogin.data.data.token;
    console.log('   🔑 Token staff obtenu');
  }
  
  // === TEST 3: PERMISSIONS OWNER ===
  console.log('\n📋 3. Permissions Owner (CORRECTION CRITIQUE)');
  console.log('-'.repeat(30));
  
  if (ownerToken) {
    await testEndpoint('GET', '/restaurants', null, ownerToken);
    await testEndpoint('GET', '/users', null, ownerToken);
    await testEndpoint('GET', '/orders', null, ownerToken);
  } else {
    console.log('❌ Token owner manquant - impossible de tester permissions');
  }
  
  // === TEST 4: CRÉATION UTILISATEUR AVEC RÔLES MINUSCULES ===
  console.log('\n📋 4. Création utilisateur (rôles minuscules)');
  console.log('-'.repeat(30));
  
  if (adminToken) {
    const testUser = {
      firstName: 'Test',
      lastName: 'Validation',
      email: `test.validation.${Date.now()}@zengest.com`,
      password: 'Test123!',
      role: 'staff_floor', // MINUSCULES
      phone: '+33123456789'
    };
    
    const createResult = await testEndpoint('POST', '/users', testUser, adminToken, 201);
    
    if (createResult.success && createResult.data.data?.user?.id) {
      console.log('   👤 Utilisateur créé avec rôle minuscule');
      
      // Nettoyer - supprimer l'utilisateur test
      await testEndpoint('DELETE', `/users/${createResult.data.data.user.id}`, null, adminToken);
      console.log('   🧹 Utilisateur test supprimé');
    }
  }
  
  // === TEST 5: COMMANDES SANS FLOORPLANID ===
  console.log('\n📋 5. Commandes sans floorPlanId (gestion auto)');
  console.log('-'.repeat(30));
  
  if (staffToken) {
    // Récupérer un élément du menu
    const menuResult = await testEndpoint('GET', '/menu?limit=1', null, staffToken);
    
    if (menuResult.success && menuResult.data.data?.menuItems?.length > 0) {
      const menuItem = menuResult.data.data.menuItems[0];
      
      const newOrder = {
        tableNumber: '999',
        customer: {
          name: 'Client Test Validation' // Format name simple
        },
        items: [{
          menuItem: menuItem.id,
          quantity: 1,
          price: menuItem.basePrice || 10
        }]
        // PAS de floorPlanId - doit être géré automatiquement
      };
      
      await testEndpoint('POST', '/orders', newOrder, staffToken, 201);
    } else {
      console.log('   ⚠️ Aucun élément menu trouvé pour test commande');
    }
  }
  
  // === TEST 6: RÉSERVATIONS FORMAT FLEXIBLE ===
  console.log('\n📋 6. Réservations format client flexible');
  console.log('-'.repeat(30));
  
  if (staffToken) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);
    
    // Test avec name simple (doit être splitté)
    const reservation = {
      customer: {
        name: 'Jean Paul Test', // Nom complet simple
        email: 'jean.test.validation@example.com',
        phone: '+33123456789'
      },
      dateTime: tomorrow.toISOString(),
      partySize: 2
    };
    
    await testEndpoint('POST', '/reservations', reservation, staffToken, 201);
  }
  
  // === TEST 7: ROUTES SPÉCIALISÉES ===
  console.log('\n📋 7. Routes spécialisées');
  console.log('-'.repeat(30));
  
  if (staffToken) {
    await testEndpoint('GET', '/orders/active', null, staffToken);
    await testEndpoint('GET', '/orders/statistics/summary', null, staffToken);
    await testEndpoint('GET', '/menu/categories', null, staffToken);
    await testEndpoint('GET', '/floor-plans/default', null, staffToken);
  }
  
  // === TEST 8: PAGINATION ===
  console.log('\n📋 8. Système de pagination');
  console.log('-'.repeat(30));
  
  if (adminToken) {
    await testEndpoint('GET', '/users?page=1&limit=3', null, adminToken);
    await testEndpoint('GET', '/orders?page=1&limit=5', null, staffToken);
    await testEndpoint('GET', '/menu?page=1&limit=3', null, staffToken);
  }
  
  // === TEST 9: GESTION D'ERREURS ===
  console.log('\n📋 9. Gestion d\'erreurs améliorée');
  console.log('-'.repeat(30));
  
  // Test avec données invalides (doit retourner erreurs propres)
  await testEndpoint('POST', '/orders', { invalid: 'data' }, staffToken, 400);
  await testEndpoint('GET', '/orders/invalid-id', null, staffToken, 400);
  await testEndpoint('GET', '/users/invalid-id', null, adminToken, 400);
  
  // === RAPPORT FINAL ===
  console.log('\n' + '='.repeat(50));
  console.log('📊 RAPPORT DE VALIDATION RAPIDE');
  console.log('='.repeat(50));
  
  console.log('✅ Tests terminés - Vérifiez les résultats ci-dessus');
  console.log('💡 Si vous voyez principalement des ✅, les corrections sont effectives');
  console.log('⚠️ Si vous voyez des ❌, des ajustements supplémentaires sont nécessaires');
  
  console.log('\n🎯 CORRECTIONS TESTÉES:');
  console.log('• Permissions Owner pour restaurants/users/orders');
  console.log('• Rôles utilisateur en minuscules (staff_floor, etc.)');
  console.log('• RestaurantId optionnel dans modèle User');
  console.log('• Gestion automatique floorPlanId dans commandes');
  console.log('• Formats clients flexibles dans réservations');
  console.log('• Validations assouplies dans middleware');
  console.log('• Populate sécurisé dans les requêtes');
  console.log('• Gestion d\'erreurs améliorée');
  
  console.log('\n🚀 ÉTAPES SUIVANTES:');
  console.log('1. Si validation OK → Lancez le test complet');
  console.log('2. Si problèmes → Vérifiez les logs d\'erreur');
  console.log('3. Redémarrez le serveur si nécessaire');
  
  console.log(`\n⏰ Validation terminée à ${new Date().toLocaleTimeString()}`);
};

// === VÉRIFICATION ENVIRONNEMENT ===
const checkEnvironment = () => {
  console.log('🔍 Vérification environnement...');
  
  if (typeof fetch === 'undefined') {
    console.error('❌ fetch non disponible. Node.js 18+ requis');
    process.exit(1);
  }
  
  console.log('✅ Environnement compatible\n');
};

// === DÉMARRAGE ===
checkEnvironment();
runQuickValidation().catch(error => {
  console.error('\n💥 ERREUR VALIDATION:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});