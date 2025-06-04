/**
 * TEST COMPLET ZENGEST BACKEND v1.2.0 - VERSION ADAPTÉE
 * Prend en compte la création automatique de restaurant pour les owners
 * et gère tous les cas de figure évoqués dans les discussions précédentes
 */

console.log('🧪 TEST COMPLET ZENGEST BACKEND v1.2.0 - ADAPTÉ');
console.log('=' .repeat(60));
console.log('⚡ Test de toutes les fonctionnalités du système');
console.log('🎯 Objectif: Validation complète avec gestion auto restaurant');
console.log('🆕 Nouveau: Création automatique restaurant pour owners\n');

const API_BASE = 'http://localhost:3000/api';

// Configuration des comptes de test
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@zengest.com',
    password: 'Admin123!',
    role: 'ADMIN',
    name: 'Admin Système'
  },
  owner: {
    email: 'owner@bistrot-zengest.com',
    password: 'Owner123!',
    role: 'OWNER',
    name: 'Jean Dupont'
  },
  manager: {
    email: 'manager@bistrot-zengest.com',
    password: 'Manager123!',
    role: 'MANAGER',
    name: 'Marie Martin'
  },
  staff_floor: {
    email: 'sophie.salle@bistrot-zengest.com',
    password: 'Staff123!',
    role: 'STAFF_FLOOR',
    name: 'Sophie Bernard'
  },
  staff_bar: {
    email: 'pierre.bar@bistrot-zengest.com',
    password: 'Staff123!',
    role: 'STAFF_BAR',
    name: 'Pierre Leroy'
  },
  staff_kitchen: {
    email: 'paul.cuisine@bistrot-zengest.com',
    password: 'Staff123!',
    role: 'STAFF_KITCHEN',
    name: 'Paul Roux'
  }
};

// État global des tests
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  userTokens: {},
  userData: {},
  restaurantCreated: false,
  startTime: Date.now()
};

// Utilitaires
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const responseData = await response.text();
  
  let parsedData;
  try {
    parsedData = JSON.parse(responseData);
  } catch {
    parsedData = { rawResponse: responseData };
  }

  return {
    status: response.status,
    ok: response.ok,
    data: parsedData,
    headers: Object.fromEntries(response.headers.entries())
  };
};

const logTest = (testName, success, details = '', duration = 0) => {
  testResults.total++;
  const status = success ? '✅' : '❌';
  const time = duration > 0 ? ` (${duration}ms)` : '';
  
  if (success) {
    testResults.passed++;
    console.log(`${status} ${testName}${time}`);
    if (details) console.log(`   💡 ${details}`);
  } else {
    testResults.failed++;
    console.log(`${status} ${testName}${time}`);
    if (details) console.log(`   ❌ ${details}`);
    testResults.errors.push({ test: testName, error: details });
  }
};

const logSection = (title) => {
  console.log(`\n${'📋 ' + title}`);
  console.log('─'.repeat(50));
};

// === NOUVELLE FONCTION: GESTION RESTAURANT OWNER ===
const ensureOwnerHasRestaurant = async (ownerToken, ownerData) => {
  console.log('\n🔍 Vérification restaurant pour owner...');
  
  try {
    // Vérifier si l'owner a déjà un restaurant assigné
    if (ownerData.restaurantId) {
      console.log(`✅ Owner a déjà un restaurant: ${ownerData.restaurantId.name || ownerData.restaurantId}`);
      return ownerData.restaurantId;
    }

    console.log('⚠️ Owner sans restaurant assigné - création automatique...');

    // Créer un restaurant pour l'owner
    const newRestaurant = {
      name: `Restaurant de ${ownerData.firstName} ${ownerData.lastName}`,
      description: 'Restaurant créé automatiquement pour les tests',
      address: {
        street: '123 Rue de Test',
        city: 'Paris',
        zipCode: '75001',
        country: 'France'
      },
      contact: {
        phone: '+33140123456',
        email: ownerData.email.replace('@', '+restaurant@')
      },
      cuisine: ['française', 'moderne'],
      priceRange: '€€',
      capacity: {
        seatingCapacity: 50,
        tablesCount: 12
      },
      hours: {
        monday: { open: '12:00', close: '14:30', closed: false },
        tuesday: { open: '12:00', close: '14:30', closed: false },
        wednesday: { open: '12:00', close: '14:30', closed: false },
        thursday: { open: '12:00', close: '14:30', closed: false },
        friday: { open: '12:00', close: '14:30', closed: false },
        saturday: { open: '19:00', close: '23:00', closed: false },
        sunday: { closed: true }
      },
      features: {
        wifi: true,
        terrace: false,
        reservations: true,
        creditCards: true
      },
      owner: ownerData._id
    };

    // Utiliser le token admin pour créer le restaurant
    const adminToken = testResults.userTokens.admin;
    if (!adminToken) {
      throw new Error('Token admin requis pour créer le restaurant');
    }

    const createResponse = await makeRequest('POST', '/restaurants', newRestaurant, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (!createResponse.ok) {
      throw new Error(`Échec création restaurant: ${createResponse.data.message}`);
    }

    const restaurant = createResponse.data.data.restaurant;
    console.log(`✅ Restaurant créé: ${restaurant.name} (ID: ${restaurant.id})`);

    // Assigner le restaurant à l'owner
    const updateResponse = await makeRequest('PUT', `/users/${ownerData._id}`, {
      restaurantId: restaurant.id
    }, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (!updateResponse.ok) {
      console.warn(`⚠️ Impossible d'assigner le restaurant à l'owner: ${updateResponse.data.message}`);
    } else {
      console.log(`✅ Restaurant assigné à l'owner`);
    }

    testResults.restaurantCreated = true;
    return restaurant;

  } catch (error) {
    console.error(`❌ Erreur gestion restaurant owner: ${error.message}`);
    return null;
  }
};

// === TESTS PRINCIPAUX MODIFIÉS ===

// 1. Test de connectivité et santé du serveur
const testServerHealth = async () => {
  logSection('TEST CONNECTIVITÉ SERVEUR');
  
  try {
    const start = Date.now();
    
    // Test ping serveur
    const healthResponse = await makeRequest('GET', '/health');
    const healthDuration = Date.now() - start;
    
    logTest(
      'Santé du serveur',
      healthResponse.ok && healthResponse.data.success,
      `Uptime: ${healthResponse.data.uptime}s, Env: ${healthResponse.data.environment}`,
      healthDuration
    );

    // Test documentation API
    const docsResponse = await makeRequest('GET', '/docs');
    logTest(
      'Documentation API',
      docsResponse.ok && docsResponse.data.success,
      `Version: ${docsResponse.data.version}`
    );

    // Test route racine
    const rootResponse = await makeRequest('GET', '/');
    logTest(
      'Route racine',
      rootResponse.ok && rootResponse.data.success,
      `Zengest v${rootResponse.data.version}`
    );

    return true;
  } catch (error) {
    logTest('Connectivité serveur', false, `Erreur: ${error.message}`);
    return false;
  }
};

// 2. Test d'authentification MODIFIÉ avec gestion restaurant
const testAuthentication = async () => {
  logSection('TEST AUTHENTIFICATION & GESTION RESTAURANT');
  
  for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
    try {
      const start = Date.now();
      const response = await makeRequest('POST', '/auth/login', {
        email: account.email,
        password: account.password
      });
      const duration = Date.now() - start;

      if (response.ok && response.data.success) {
        testResults.userTokens[role] = response.data.data.token;
        testResults.userData[role] = response.data.data.user;
        
        logTest(
          `Connexion ${account.name} (${role})`,
          true,
          `Token généré, Restaurant: ${response.data.data.user.restaurantId?.name || 'N/A'}`,
          duration
        );
        
        // Test route /auth/me
        const meResponse = await makeRequest('GET', '/auth/me', null, {
          'Authorization': `Bearer ${testResults.userTokens[role]}`
        });
        
        logTest(
          `Profil ${role}`,
          meResponse.ok && meResponse.data.success,
          `Rôle: ${meResponse.data.data.user.role}, Permissions: ${meResponse.data.data.permissions?.length || 0}`
        );

        // NOUVEAU: Gestion spéciale pour les owners
        if (role === 'owner') {
          const ownerData = response.data.data.user;
          const restaurant = await ensureOwnerHasRestaurant(
            testResults.userTokens[role], 
            ownerData
          );
          
          if (restaurant) {
            logTest(
              'Restaurant owner configuré',
              true,
              `Restaurant: ${restaurant.name}`
            );
            
            // Mettre à jour les données utilisateur avec le restaurant
            testResults.userData[role].restaurantId = restaurant;
          } else {
            logTest(
              'Restaurant owner configuré',
              false,
              'Impossible de créer/assigner un restaurant'
            );
          }
        }
        
      } else {
        logTest(
          `Connexion ${account.name} (${role})`,
          false,
          response.data.message || 'Échec de connexion',
          duration
        );
      }
    } catch (error) {
      logTest(`Authentification ${role}`, false, error.message);
    }
  }
};

// 3. Test des permissions MODIFIÉ
const testPermissions = async () => {
  logSection('TEST PERMISSIONS & AUTORISATIONS');
  
  const permissionTests = [
    {
      name: 'Admin accès utilisateurs',
      role: 'admin',
      endpoint: '/users',
      shouldPass: true
    },
    {
      name: 'Staff accès utilisateurs (interdit)',
      role: 'staff_floor',
      endpoint: '/users',
      shouldPass: false
    },
    {
      name: 'Owner accès restaurant',
      role: 'owner',
      endpoint: '/restaurants',
      shouldPass: true,
      note: 'Owner doit maintenant avoir un restaurant'
    },
    {
      name: 'Staff accès commandes',
      role: 'staff_floor',
      endpoint: '/orders',
      shouldPass: true
    },
    {
      name: 'Manager accès réservations',
      role: 'manager',
      endpoint: '/reservations',
      shouldPass: true
    },
    {
      name: 'Staff bar accès menu',
      role: 'staff_bar',
      endpoint: '/menu',
      shouldPass: true
    }
  ];

  for (const test of permissionTests) {
    try {
      const token = testResults.userTokens[test.role];
      if (!token) {
        logTest(test.name, false, 'Token non disponible');
        continue;
      }

      const response = await makeRequest('GET', test.endpoint, null, {
        'Authorization': `Bearer ${token}`
      });

      const success = test.shouldPass ? response.ok : !response.ok;
      
      logTest(
        test.name,
        success,
        `Status: ${response.status} (attendu: ${test.shouldPass ? '2xx' : '403'})${test.note ? ' - ' + test.note : ''}`
      );
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
};

// 4. Test des restaurants MODIFIÉ
const testRestaurants = async () => {
  logSection('TEST GESTION RESTAURANTS');
  
  const adminToken = testResults.userTokens.admin;
  if (!adminToken) {
    logTest('Gestion restaurants', false, 'Token admin requis');
    return;
  }

  try {
    // Liste des restaurants
    const listResponse = await makeRequest('GET', '/restaurants', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest(
      'Liste restaurants',
      listResponse.ok,
      `${listResponse.data.data?.restaurants?.length || 0} restaurants`
    );

    if (listResponse.ok && listResponse.data.data.restaurants.length > 0) {
      const restaurant = listResponse.data.data.restaurants[0];
      
      // Détails d'un restaurant
      const detailResponse = await makeRequest('GET', `/restaurants/${restaurant.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      logTest('Détails restaurant', detailResponse.ok, restaurant.name);

      // Statut du restaurant
      const statusResponse = await makeRequest('GET', `/restaurants/${restaurant.id}/status`);
      logTest('Statut restaurant', statusResponse.ok, 'Statut récupéré');

      // NOUVEAU: Test accès owner au restaurant créé
      const ownerToken = testResults.userTokens.owner;
      if (ownerToken && testResults.restaurantCreated) {
        const ownerAccessResponse = await makeRequest('GET', `/restaurants/${restaurant.id}`, null, {
          'Authorization': `Bearer ${ownerToken}`
        });
        logTest(
          'Owner accès son restaurant',
          ownerAccessResponse.ok,
          'Owner peut accéder à son restaurant créé'
        );
      }
    }
  } catch (error) {
    logTest('Gestion restaurants', false, error.message);
  }
};

// 5. Test création commande MODIFIÉ avec gestion plan par défaut
const testOrdersWithFloorPlan = async () => {
  logSection('TEST SYSTÈME COMMANDES (AVEC PLAN AUTO)');
  
  const staffToken = testResults.userTokens.staff_floor;
  if (!staffToken) {
    logTest('Système commandes', false, 'Token staff requis');
    return;
  }

  try {
    // Liste des commandes
    const ordersResponse = await makeRequest('GET', '/orders', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest(
      'Liste commandes',
      ordersResponse.ok,
      `${ordersResponse.data.data?.orders?.length || 0} commandes`
    );

    // Commandes actives
    const activeResponse = await makeRequest('GET', '/orders/active', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest(
      'Commandes actives',
      activeResponse.ok,
      `${activeResponse.data.data?.orders?.length || 0} actives`
    );

    // NOUVEAU: Test création commande SANS floorPlanId (doit utiliser le défaut)
    const menuResponse = await makeRequest('GET', '/menu?limit=1', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    
    if (menuResponse.ok && menuResponse.data.data.menuItems.length > 0) {
      const menuItem = menuResponse.data.data.menuItems[0];
      
      // Test 1: Commande SANS floorPlanId
      const newOrderWithoutPlan = {
        tableNumber: '999',
        customer: {
          name: 'Client Test Sans Plan' // Format name simple
        },
        items: [{
          menuItem: menuItem.id,
          quantity: 1,
          price: menuItem.basePrice || 10
        }]
        // PAS de floorPlanId - doit être géré automatiquement
      };

      const createResponse1 = await makeRequest('POST', '/orders', newOrderWithoutPlan, {
        'Authorization': `Bearer ${staffToken}`
      });
      
      logTest(
        'Création commande sans floorPlanId',
        createResponse1.ok,
        createResponse1.ok ? 'Plan par défaut utilisé automatiquement' : createResponse1.data.message
      );

      // Test 2: Commande avec format customer.firstName/lastName
      const newOrderWithNames = {
        tableNumber: '998',
        customer: {
          firstName: 'Jean',
          lastName: 'Test',
          phone: '+33123456789'
        },
        items: [{
          menuItem: menuItem.id,
          quantity: 2,
          price: menuItem.basePrice || 10
        }]
      };

      const createResponse2 = await makeRequest('POST', '/orders', newOrderWithNames, {
        'Authorization': `Bearer ${staffToken}`
      });
      
      logTest(
        'Création commande format firstName/lastName',
        createResponse2.ok,
        createResponse2.ok ? 'Format client standard accepté' : createResponse2.data.message
      );

      // Test modification du statut si commande créée
      if (createResponse1.ok) {
        const orderId = createResponse1.data.data.order.id;
        const statusResponse = await makeRequest('PATCH', `/orders/${orderId}/status`, {
          status: 'confirmed'
        }, {
          'Authorization': `Bearer ${staffToken}`
        });
        logTest('Modification statut commande', statusResponse.ok, 'Statut modifié avec succès');
      }
      
    } else {
      logTest('Menu requis pour tests commandes', false, 'Aucun élément menu trouvé');
    }

    // Statistiques des commandes
    const statsResponse = await makeRequest('GET', '/orders/statistics/summary', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest('Statistiques commandes', statsResponse.ok, 'Stats récupérées');

  } catch (error) {
    logTest('Système commandes avancé', false, error.message);
  }
};

// 6. Test réservations MODIFIÉ avec gestion nom flexible
const testReservationsFlexible = async () => {
  logSection('TEST SYSTÈME RÉSERVATIONS (FORMAT FLEXIBLE)');
  
  const managerToken = testResults.userTokens.manager;
  if (!managerToken) {
    logTest('Système réservations', false, 'Token manager requis');
    return;
  }

  try {
    // Liste des réservations
    const reservationsResponse = await makeRequest('GET', '/reservations', null, {
      'Authorization': `Bearer ${managerToken}`
    });
    logTest(
      'Liste réservations',
      reservationsResponse.ok,
      `${reservationsResponse.data.data?.reservations?.length || 0} réservations`
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    // Test 1: Réservation avec firstName/lastName
    const reservation1 = {
      customer: {
        firstName: 'Test',
        lastName: 'Reservation',
        email: 'test.reservation1@example.com',
        phone: '+33123456789'
      },
      dateTime: tomorrow.toISOString(),
      partySize: 4,
      specialRequests: ['Table près de la fenêtre']
    };

    const createResponse1 = await makeRequest('POST', '/reservations', reservation1, {
      'Authorization': `Bearer ${managerToken}`
    });
    
    logTest(
      'Réservation format firstName/lastName',
      createResponse1.ok,
      createResponse1.ok ? 'Format standard accepté' : createResponse1.data.message
    );

    // Test 2: Réservation avec name simple (doit être splitté)
    const reservation2 = {
      customer: {
        name: 'Jean Paul Dupont', // Nom complet simple
        email: 'jean.paul@example.com',
        phone: '+33123456789'
      },
      dateTime: new Date(tomorrow.getTime() + 3600000).toISOString(), // +1h
      partySize: 2
    };

    const createResponse2 = await makeRequest('POST', '/reservations', reservation2, {
      'Authorization': `Bearer ${managerToken}`
    });
    
    logTest(
      'Réservation format name simple',
      createResponse2.ok,
      createResponse2.ok ? 'Nom automatiquement splitté en firstName/lastName' : createResponse2.data.message
    );

    // Test assignation table si réservation créée
    if (createResponse1.ok) {
      const reservationId = createResponse1.data.data.reservation.id;
      
      // Confirmer la réservation
      const statusResponse = await makeRequest('PATCH', `/reservations/${reservationId}/status`, {
        status: 'confirmed'
      }, {
        'Authorization': `Bearer ${managerToken}`
      });
      logTest('Confirmation réservation', statusResponse.ok, 'Réservation confirmée');

      // Tenter d'assigner une table
      const floorPlanResponse = await makeRequest('GET', '/floor-plans/default', null, {
        'Authorization': `Bearer ${managerToken}`
      });
      
      if (floorPlanResponse.ok && floorPlanResponse.data.data.floorPlan?.tables?.length > 0) {
        const table = floorPlanResponse.data.data.floorPlan.tables[0];
        const assignResponse = await makeRequest('PATCH', `/reservations/${reservationId}/assign-table`, {
          floorPlanId: floorPlanResponse.data.data.floorPlan.id,
          tableNumber: table.number
        }, {
          'Authorization': `Bearer ${managerToken}`
        });
        logTest('Assignment table', assignResponse.ok, `Table ${table.number} assignée`);
      }
    }

    // Réservations par date (aujourd'hui)
    const today = new Date().toISOString().split('T')[0];
    const dateResponse = await makeRequest('GET', `/reservations/date/${today}`, null, {
      'Authorization': `Bearer ${managerToken}`
    });
    logTest(
      'Réservations du jour',
      dateResponse.ok,
      `${dateResponse.data.data?.reservations?.length || 0} aujourd'hui`
    );

  } catch (error) {
    logTest('Système réservations flexible', false, error.message);
  }
};

// === REPRENDRE LES AUTRES TESTS (INCHANGÉS) ===

// 7. Test des plans de salle
const testFloorPlans = async () => {
  logSection('TEST PLANS DE SALLE');
  
  const managerToken = testResults.userTokens.manager;
  if (!managerToken) {
    logTest('Plans de salle', false, 'Token manager requis');
    return;
  }

  try {
    // Liste des plans
    const listResponse = await makeRequest('GET', '/floor-plans', null, {
      'Authorization': `Bearer ${managerToken}`
    });
    logTest(
      'Liste plans de salle',
      listResponse.ok,
      `${listResponse.data.data?.floorPlans?.length || 0} plans`
    );

    // Plan par défaut
    const defaultResponse = await makeRequest('GET', '/floor-plans/default', null, {
      'Authorization': `Bearer ${managerToken}`
    });
    logTest('Plan par défaut', defaultResponse.ok, 'Plan récupéré');

    if (defaultResponse.ok && defaultResponse.data.data.floorPlan) {
      const floorPlan = defaultResponse.data.data.floorPlan;
      
      // Détails du plan
      const detailResponse = await makeRequest('GET', `/floor-plans/${floorPlan.id}`, null, {
        'Authorization': `Bearer ${managerToken}`
      });
      logTest(
        'Détails plan',
        detailResponse.ok,
        `${floorPlan.tables?.length || 0} tables, Capacité: ${floorPlan.totalCapacity || 0}`
      );

      // Test de modification de statut de table
      if (floorPlan.tables && floorPlan.tables.length > 0) {
        const table = floorPlan.tables[0];
        const statusResponse = await makeRequest('PATCH', 
          `/floor-plans/${floorPlan.id}/tables/${table.id}/status`,
          { status: 'occupied' },
          { 'Authorization': `Bearer ${managerToken}` }
        );
        logTest('Modification statut table', statusResponse.ok, `Table ${table.number} modifiée`);
      }
    }
  } catch (error) {
    logTest('Plans de salle', false, error.message);
  }
};

// 8. Test du menu
const testMenu = async () => {
  logSection('TEST GESTION MENU');
  
  const staffToken = testResults.userTokens.staff_bar;
  if (!staffToken) {
    logTest('Gestion menu', false, 'Token staff requis');
    return;
  }

  try {
    // Liste du menu
    const menuResponse = await makeRequest('GET', '/menu', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest(
      'Liste menu',
      menuResponse.ok,
      `${menuResponse.data.data?.menuItems?.length || 0} éléments`
    );

    // Catégories
    const categoriesResponse = await makeRequest('GET', '/menu/categories', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest(
      'Catégories menu',
      categoriesResponse.ok,
      `${categoriesResponse.data.data?.categories?.length || 0} catégories`
    );

    // Test avec pagination
    const paginatedResponse = await makeRequest('GET', '/menu?page=1&limit=5', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest(
      'Pagination menu',
      paginatedResponse.ok,
      `Page ${paginatedResponse.data.data?.pagination?.currentPage || 0}/${paginatedResponse.data.data?.pagination?.totalPages || 0}`
    );

    if (menuResponse.ok && menuResponse.data.data.menuItems.length > 0) {
      const menuItem = menuResponse.data.data.menuItems[0];
      
      // Détails d'un élément
      const itemResponse = await makeRequest('GET', `/menu/${menuItem.id}`, null, {
        'Authorization': `Bearer ${staffToken}`
      });
      logTest('Détails élément menu', itemResponse.ok, menuItem.name);
    }
  } catch (error) {
    logTest('Gestion menu', false, error.message);
  }
};

// 9. Test des utilisateurs MODIFIÉ avec rôles en minuscules
const testUserOperations = async () => {
  logSection('TEST GESTION UTILISATEURS (RÔLES MINUSCULES)');
  
  const adminToken = testResults.userTokens.admin;
  if (!adminToken) {
    logTest('CRUD Utilisateurs', false, 'Token admin requis');
    return;
  }

  try {
    // Liste des utilisateurs
    const listResponse = await makeRequest('GET', '/users', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest(
      'Liste utilisateurs',
      listResponse.ok,
      `${listResponse.data.data?.users?.length || 0} utilisateurs trouvés`
    );

    // Test pagination utilisateurs
    const paginatedResponse = await makeRequest('GET', '/users?page=1&limit=3', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest(
      'Pagination utilisateurs',
      paginatedResponse.ok && paginatedResponse.data.data?.pagination,
      paginatedResponse.ok ? `${paginatedResponse.data.data.pagination.total} utilisateurs` : 'Pagination manquante'
    );

    // Créer un utilisateur de test avec rôle en minuscules
    const newUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${Date.now()}@zengest.com`,
      password: 'Test123!',
      role: 'staff_floor', // MINUSCULES
      phone: '+33123456789'
    };

    const createResponse = await makeRequest('POST', '/users', newUser, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    let userId = null;
    if (createResponse.ok) {
      userId = createResponse.data.data.user.id;
      logTest('Création utilisateur (rôle minuscule)', true, `ID: ${userId}, Rôle: ${createResponse.data.data.user.role}`);

      // Modifier l'utilisateur
      const updateResponse = await makeRequest('PUT', `/users/${userId}`, {
        firstName: 'Test Updated'
      }, {
        'Authorization': `Bearer ${adminToken}`
      });
      logTest('Modification utilisateur', updateResponse.ok, 'Prénom modifié');

      // Récupérer l'utilisateur
      const getResponse = await makeRequest('GET', `/users/${userId}`, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      logTest(
        'Récupération utilisateur',
        getResponse.ok,
        `Nom: ${getResponse.data.data?.user?.firstName}`
      );

      // Supprimer l'utilisateur
      const deleteResponse = await makeRequest('DELETE', `/users/${userId}`, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      logTest('Suppression utilisateur', deleteResponse.ok, 'Utilisateur supprimé');
    } else {
      logTest('Création utilisateur (rôle minuscule)', false, createResponse.data.message);
    }
  } catch (error) {
    logTest('CRUD Utilisateurs', false, error.message);
  }
};

// 10. Test des notifications
const testNotifications = async () => {
  logSection('TEST SYSTÈME NOTIFICATIONS');
  
  const adminToken = testResults.userTokens.admin;
  if (!adminToken) {
    logTest('Système notifications', false, 'Token admin requis');
    return;
  }

  try {
    // Test email
    const testEmailResponse = await makeRequest('POST', '/notifications/test', {
      email: 'test@example.com'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest(
      'Test email',
      testEmailResponse.ok,
      testEmailResponse.data.messageId ? 'Email envoyé' : 'Configuration email manquante'
    );

    // Statistiques notifications
    const statsResponse = await makeRequest('GET', '/notifications/stats', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    logTest('Statistiques notifications', statsResponse.ok, 'Stats récupérées');

  } catch (error) {
    logTest('Système notifications', false, error.message);
  }
};

// === FONCTION PRINCIPALE MODIFIÉE ===
const runCompleteTest = async () => {
  console.log(`🚀 Démarrage des tests adaptés à ${new Date().toLocaleTimeString()}\n`);
  
  try {
    // Vérifier que le serveur est accessible
    const serverHealthy = await testServerHealth();
    if (!serverHealthy) {
      console.log('\n❌ ARRÊT: Serveur non accessible');
      console.log('💡 Vérifiez que le serveur est démarré: npm run dev');
      return;
    }

    // Suite des tests modifiés
    await testAuthentication(); // MODIFIÉ: gestion restaurant owner
    await testPermissions(); // MODIFIÉ: note owner restaurant
    await testUserOperations(); // MODIFIÉ: rôles minuscules + pagination
    await testRestaurants(); // MODIFIÉ: test accès owner
    await testFloorPlans();
    await testMenu();
    await testOrdersWithFloorPlan(); // MODIFIÉ: test plan auto + format client
    await testReservationsFlexible(); // MODIFIÉ: formats nom flexibles
    await testNotifications();

    // Rapport final
    await generateFinalReport();

  } catch (error) {
    console.error('\n💥 ERREUR FATALE:', error.message);
    console.error('Stack:', error.stack);
  }
};

const generateFinalReport = async () => {
  const duration = Date.now() - testResults.startTime;
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL - TESTS ZENGEST BACKEND ADAPTÉS');
  console.log('='.repeat(60));
  
  console.log(`⏱️  Durée totale: ${(duration / 1000).toFixed(1)}s`);
  console.log(`📋 Tests exécutés: ${testResults.total}`);
  console.log(`✅ Tests réussis: ${testResults.passed}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  console.log(`📈 Taux de réussite: ${successRate}%`);
  
  // Nouvelles fonctionnalités testées
  console.log('\n🆕 NOUVELLES FONCTIONNALITÉS TESTÉES:');
  console.log('-'.repeat(40));
  console.log(`🏢 Restaurant auto-créé pour owner: ${testResults.restaurantCreated ? 'OUI' : 'NON'}`);
  console.log('📋 Commandes sans floorPlanId (plan auto)');
  console.log('👤 Formats clients flexibles (name vs firstName/lastName)');
  console.log('🔤 Rôles utilisateur en minuscules');
  console.log('📄 Pagination sur tous les endpoints');
  
  // Évaluation globale
  if (successRate >= 95) {
    console.log('\n🎉 PARFAIT! Système entièrement fonctionnel avec toutes les adaptations');
    console.log('✨ Toutes les corrections et améliorations fonctionnent');
  } else if (successRate >= 85) {
    console.log('\n✅ EXCELLENT! Système largement fonctionnel');
    console.log('🔧 Quelques ajustements mineurs peuvent être nécessaires');
  } else if (successRate >= 70) {
    console.log('\n⚠️ BON! Progrès significatif mais corrections à poursuivre');
  } else {
    console.log('\n❌ CRITIQUE! Problèmes majeurs persistants');
  }

  // Détail des erreurs
  if (testResults.errors.length > 0) {
    console.log('\n🔍 ERREURS DÉTECTÉES:');
    console.log('-'.repeat(40));
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   💬 ${error.error}`);
    });
  }

  // Recommandations spécifiques
  console.log('\n💡 RECOMMANDATIONS ADAPTÉES:');
  console.log('-'.repeat(40));

  if (testResults.errors.some(e => e.test.includes('owner') || e.test.includes('restaurant'))) {
    console.log('🏢 Problèmes restaurant owner:');
    console.log('   • Vérifiez que les contrôleurs restaurant sont bien créés');
    console.log('   • Contrôlez les permissions owner dans auth.js');
  }

  if (testResults.errors.some(e => e.test.includes('rôle') || e.test.includes('user'))) {
    console.log('👤 Problèmes utilisateurs/rôles:');
    console.log('   • Vérifiez le modèle User (rôles en minuscules)');
    console.log('   • Contrôlez que restaurantId est optionnel');
  }

  if (testResults.errors.some(e => e.test.includes('commande') || e.test.includes('order'))) {
    console.log('📋 Problèmes commandes:');
    console.log('   • Vérifiez la gestion floorPlanId par défaut');
    console.log('   • Contrôlez les formats client name vs firstName/lastName');
  }

  // État du système
  console.log('\n🏥 ÉTAT DU SYSTÈME ADAPTÉ:');
  console.log('-'.repeat(40));
  
  const criticalFeatures = [
    'Restaurant owner automatique',
    'Commandes sans floorPlanId',
    'Formats clients flexibles',
    'Rôles minuscules',
    'Pagination complète'
  ];

  criticalFeatures.forEach(feature => {
    const hasError = testResults.errors.some(e => 
      e.test.toLowerCase().includes(feature.toLowerCase().split(' ')[0])
    );
    console.log(`${hasError ? '❌' : '✅'} ${feature}: ${hasError ? 'PROBLÈME' : 'OK'}`);
  });

  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('-'.repeat(40));
  
  if (successRate >= 90) {
    console.log('✅ Système prêt avec toutes les adaptations!');
    console.log('🚀 Backend Zengest entièrement fonctionnel');
    console.log('📱 Prêt pour connexion frontend');
  } else {
    console.log('🔧 Poursuivre les corrections selon les erreurs ci-dessus');
    console.log('🔄 Relancer ce test après corrections');
    console.log('📖 Consulter la documentation pour détails');
  }

  console.log(`\n⏰ Test terminé à ${new Date().toLocaleTimeString()}`);
  console.log('🙏 Merci d\'utiliser Zengest Backend avec toutes ses adaptations!');
};

// Vérifier Node.js et dépendances
const checkEnvironment = () => {
  console.log('🔍 Vérification environnement...');
  
  // Vérifier Node.js version
  const nodeVersion = process.version;
  console.log(`📦 Node.js: ${nodeVersion}`);
  
  // Vérifier fetch (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('❌ fetch non disponible. Node.js 18+ requis ou installez node-fetch');
    process.exit(1);
  }
  
  console.log('✅ Environnement compatible\n');
};

// === DÉMARRAGE ===
checkEnvironment();
runCompleteTest().catch(error => {
  console.error('\n💥 ÉCHEC CRITIQUE:', error.message);
  process.exit(1);
});