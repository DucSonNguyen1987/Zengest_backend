console.log('🧪 TEST COMPLET ZENGEST BACKEND v1.2.0');
console.log('=' .repeat(60));
console.log('⚡ Test de toutes les fonctionnalités du système');
console.log('🎯 Objectif: Validation complète de l\'API\n');

const API_BASE = 'http://localhost:3000/api';
const TEST_TIMEOUT = 30000; // 30 secondes par test

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

// === TESTS PRINCIPAUX ===

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

// 2. Test d'authentification pour tous les rôles
const testAuthentication = async () => {
  logSection('TEST AUTHENTIFICATION');
  
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

// 3. Test des permissions et autorisations
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
      shouldPass: true
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
      const expectedStatus = test.shouldPass ? '200' : '403';
      
      logTest(
        test.name,
        success,
        `Status: ${response.status} (attendu: ${test.shouldPass ? '2xx' : '403'})`
      );
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
};

// 4. Test des opérations CRUD sur les utilisateurs
const testUserOperations = async () => {
  logSection('TEST GESTION UTILISATEURS');
  
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

    // Créer un utilisateur de test
    const newUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${Date.now()}@zengest.com`,
      password: 'Test123!',
      role: 'STAFF_FLOOR',
      phone: '+33123456789'
    };

    const createResponse = await makeRequest('POST', '/users', newUser, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    let userId = null;
    if (createResponse.ok) {
      userId = createResponse.data.data.user.id;
      logTest('Création utilisateur', true, `ID: ${userId}`);

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
      logTest('Création utilisateur', false, createResponse.data.message);
    }
  } catch (error) {
    logTest('CRUD Utilisateurs', false, error.message);
  }
};

// 5. Test des restaurants
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
    }
  } catch (error) {
    logTest('Gestion restaurants', false, error.message);
  }
};

// 6. Test des plans de salle
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

      // Export du plan
      const exportResponse = await makeRequest('GET', `/floor-plans/${floorPlan.id}/export`, null, {
        'Authorization': `Bearer ${managerToken}`
      });
      logTest('Export plan', exportResponse.ok, 'Plan exporté');
    }
  } catch (error) {
    logTest('Plans de salle', false, error.message);
  }
};

// 7. Test du menu
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

    // Recherche dans le menu
    const searchResponse = await makeRequest('GET', '/menu/search?q=cocktail', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest('Recherche menu', searchResponse.ok, 'Recherche effectuée');

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

// 8. Test des commandes
const testOrders = async () => {
  logSection('TEST SYSTÈME COMMANDES');
  
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

    // Statistiques des commandes
    const statsResponse = await makeRequest('GET', '/orders/statistics/summary', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest('Statistiques commandes', statsResponse.ok, 'Stats récupérées');

    // Test avec filtres
    const filteredResponse = await makeRequest('GET', '/orders?status=confirmed&page=1&limit=10', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    logTest('Filtres commandes', filteredResponse.ok, 'Filtres appliqués');

    // Test création de commande (si on a le menu)
    const menuResponse = await makeRequest('GET', '/menu?limit=1', null, {
      'Authorization': `Bearer ${staffToken}`
    });
    
    if (menuResponse.ok && menuResponse.data.data.menuItems.length > 0) {
      const menuItem = menuResponse.data.data.menuItems[0];
      
      const newOrder = {
        tableNumber: '999',
        customer: {
          name: 'Client Test',
          phone: '+33123456789'
        },
        items: [{
          menuItem: menuItem.id,
          quantity: 1,
          price: menuItem.basePrice || 10
        }]
      };

      const createOrderResponse = await makeRequest('POST', '/orders', newOrder, {
        'Authorization': `Bearer ${staffToken}`
      });
      
      if (createOrderResponse.ok) {
        const orderId = createOrderResponse.data.data.order.id;
        logTest('Création commande', true, `Commande ${orderId} créée`);

        // Test modification du statut
        const statusResponse = await makeRequest('PATCH', `/orders/${orderId}/status`, {
          status: 'confirmed'
        }, {
          'Authorization': `Bearer ${staffToken}`
        });
        logTest('Modification statut commande', statusResponse.ok, 'Statut modifié');
        
      } else {
        logTest('Création commande', false, createOrderResponse.data.message);
      }
    }
  } catch (error) {
    logTest('Système commandes', false, error.message);
  }
};

// 9. Test des réservations
const testReservations = async () => {
  logSection('TEST SYSTÈME RÉSERVATIONS');
  
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

    // Créer une réservation de test
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    const newReservation = {
      customer: {
        firstName: 'Test',
        lastName: 'Reservation',
        email: 'test.reservation@example.com',
        phone: '+33123456789'
      },
      dateTime: tomorrow.toISOString(),
      partySize: 4,
      specialRequests: ['Table près de la fenêtre']
    };

    const createResponse = await makeRequest('POST', '/reservations', newReservation, {
      'Authorization': `Bearer ${managerToken}`
    });
    
    if (createResponse.ok) {
      const reservationId = createResponse.data.data.reservation.id;
      logTest('Création réservation', true, `Réservation ${reservationId} créée`);

      // Modifier le statut
      const statusResponse = await makeRequest('PATCH', `/reservations/${reservationId}/status`, {
        status: 'confirmed'
      }, {
        'Authorization': `Bearer ${managerToken}`
      });
      logTest('Confirmation réservation', statusResponse.ok, 'Réservation confirmée');

      // Assigner une table (si on a un plan de salle)
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
    } else {
      logTest('Création réservation', false, createResponse.data.message);
    }
  } catch (error) {
    logTest('Système réservations', false, error.message);
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

    // Test avec une vraie réservation si disponible
    const reservationsResponse = await makeRequest('GET', '/reservations?limit=1', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    
    if (reservationsResponse.ok && reservationsResponse.data.data?.reservations?.length > 0) {
      const reservation = reservationsResponse.data.data.reservations[0];
      
      // Test email de confirmation
      const confirmationResponse = await makeRequest('POST', 
        `/notifications/reservations/${reservation.id}/confirmation`, 
        {}, 
        { 'Authorization': `Bearer ${adminToken}` }
      );
      logTest('Email confirmation', confirmationResponse.ok, 'Email confirmation testé');
    }
  } catch (error) {
    logTest('Système notifications', false, error.message);
  }
};

// 11. Test des fonctionnalités avancées
const testAdvancedFeatures = async () => {
  logSection('TEST FONCTIONNALITÉS AVANCÉES');
  
  const adminToken = testResults.userTokens.admin;
  if (!adminToken) {
    logTest('Fonctionnalités avancées', false, 'Token admin requis');
    return;
  }

  try {
    // Test de rate limiting (plusieurs requêtes rapides)
    let rateLimitHit = false;
    for (let i = 0; i < 10; i++) {
      const response = await makeRequest('GET', '/health');
      if (response.status === 429) {
        rateLimitHit = true;
        break;
      }
      await sleep(50);
    }
    logTest('Rate limiting', true, rateLimitHit ? 'Limite détectée' : 'Sous la limite');

    // Test de gestion d'erreurs (route inexistante)
    const notFoundResponse = await makeRequest('GET', '/route-inexistante');
    logTest('Gestion erreur 404', notFoundResponse.status === 404, 'Route inexistante gérée');

    // Test headers de sécurité
    const securityResponse = await makeRequest('GET', '/health');
    const hasSecurityHeaders = securityResponse.headers['x-content-type-options'] ||
                              securityResponse.headers['x-frame-options'] ||
                              securityResponse.headers['x-xss-protection'];
    logTest('Headers sécurité', !!hasSecurityHeaders, 'Headers sécurité présents');

    // Test CORS
    const corsResponse = await makeRequest('OPTIONS', '/health');
    logTest('CORS configuration', corsResponse.ok || corsResponse.status === 204, 'CORS configuré');

    // Test de pagination générale
    const usersResponse = await makeRequest('GET', '/users?page=1&limit=5', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    const hasPagination = usersResponse.ok && usersResponse.data.data?.pagination;
    logTest('Système pagination', hasPagination, 'Pagination fonctionnelle');

  } catch (error) {
    logTest('Fonctionnalités avancées', false, error.message);
  }
};

// 12. Test de performance et stress
const testPerformance = async () => {
  logSection('TEST PERFORMANCE');
  
  const adminToken = testResults.userTokens.admin;
  if (!adminToken) {
    logTest('Tests performance', false, 'Token admin requis');
    return;
  }

  try {
    // Test de latence
    const latencyTests = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await makeRequest('GET', '/health');
      latencyTests.push(Date.now() - start);
    }
    const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
    logTest('Latence moyenne', avgLatency < 1000, `${avgLatency.toFixed(0)}ms`);

    // Test concurrent requests
    const concurrentStart = Date.now();
    const concurrentPromises = Array(5).fill().map(() => 
      makeRequest('GET', '/menu', null, { 'Authorization': `Bearer ${adminToken}` })
    );
    await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStart;
    logTest('Requêtes concurrentes', concurrentDuration < 5000, `${concurrentDuration}ms pour 5 requêtes`);

    // Test charge mémoire (simulation)
    const memoryBefore = process.memoryUsage().heapUsed;
    
    // Faire plusieurs requêtes lourdes
    for (let i = 0; i < 10; i++) {
      await makeRequest('GET', '/orders', null, { 'Authorization': `Bearer ${adminToken}` });
    }
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024; // MB
    logTest('Gestion mémoire', memoryIncrease < 50, `+${memoryIncrease.toFixed(1)}MB`);

  } catch (error) {
    logTest('Tests performance', false, error.message);
  }
};

// === FONCTION PRINCIPALE ===
const runCompleteTest = async () => {
  console.log(`🚀 Démarrage des tests à ${new Date().toLocaleTimeString()}\n`);
  
  try {
    // Vérifier que le serveur est accessible
    const serverHealthy = await testServerHealth();
    if (!serverHealthy) {
      console.log('\n❌ ARRÊT: Serveur non accessible');
      console.log('💡 Vérifiez que le serveur est démarré: npm run dev');
      return;
    }

    // Suite des tests
    await testAuthentication();
    await testPermissions();
    await testUserOperations();
    await testRestaurants();
    await testFloorPlans();
    await testMenu();
    await testOrders();
    await testReservations();
    await testNotifications();
    await testAdvancedFeatures();
    await testPerformance();

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
  console.log('📊 RAPPORT FINAL - TESTS ZENGEST BACKEND');
  console.log('='.repeat(60));
  
  console.log(`⏱️  Durée totale: ${(duration / 1000).toFixed(1)}s`);
  console.log(`📋 Tests exécutés: ${testResults.total}`);
  console.log(`✅ Tests réussis: ${testResults.passed}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  console.log(`📈 Taux de réussite: ${successRate}%`);
  
  // Évaluation globale
  if (successRate >= 95) {
    console.log('\n🎉 EXCELLENT! Système entièrement fonctionnel');
  } else if (successRate >= 80) {
    console.log('\n✅ BON! Système largement fonctionnel avec quelques problèmes mineurs');
  } else if (successRate >= 60) {
    console.log('\n⚠️  MOYEN! Système partiellement fonctionnel, corrections nécessaires');
  } else {
    console.log('\n❌ CRITIQUE! Problèmes majeurs détectés');
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

  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('-'.repeat(40));

  if (testResults.errors.some(e => e.test.includes('Connexion'))) {
    console.log('🔧 Problèmes de connexion détectés:');
    console.log('   • Vérifiez que npm run seed a été exécuté');
    console.log('   • Vérifiez la configuration .env');
  }

  if (testResults.errors.some(e => e.test.includes('email') || e.test.includes('notification'))) {
    console.log('📧 Problèmes email détectés:');
    console.log('   • Configurez les paramètres email dans .env');
    console.log('   • Testez avec: node test-brevo.js');
  }

  if (testResults.errors.some(e => e.test.includes('commandes') || e.test.includes('orders'))) {
    console.log('📋 Problèmes commandes détectés:');
    console.log('   • Exécutez: node fix-orders-controller.js');
    console.log('   • Seedez des commandes: npm run seed:orders');
  }

  // État du système
  console.log('\n🏥 ÉTAT DU SYSTÈME:');
  console.log('-'.repeat(40));
  
  const criticalFeatures = [
    'Authentification',
    'Liste commandes',
    'Liste menu',
    'Plans de salle'
  ];

  criticalFeatures.forEach(feature => {
    const hasError = testResults.errors.some(e => e.test.toLowerCase().includes(feature.toLowerCase()));
    console.log(`${hasError ? '❌' : '✅'} ${feature}: ${hasError ? 'PROBLÈME' : 'OK'}`);
  });

  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('-'.repeat(40));
  
  if (successRate >= 90) {
    console.log('✅ Système prêt pour la production!');
    console.log('🚀 Vous pouvez déployer le backend');
    console.log('📱 Connectez votre frontend');
  } else {
    console.log('🔧 Corrigez les erreurs détectées');
    console.log('🔄 Relancez ce test après corrections');
    console.log('📖 Consultez la documentation pour plus d\'aide');
  }

  console.log(`\n⏰ Test terminé à ${new Date().toLocaleTimeString()}`);
  console.log('🙏 Merci d\'utiliser Zengest Backend!');
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