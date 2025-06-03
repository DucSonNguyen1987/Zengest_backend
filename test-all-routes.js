console.log('🧪 Test complet de toutes les routes API Zengest\n');

const API_BASE = 'http://localhost:3000/api';

const testAllRoutes = async () => {
  let globalToken = null;
  
  try {
    // Étape 1: Connexion
    console.log('🔐 ÉTAPE 1: Authentification...');
    
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Échec connexion:', loginData.message);
      return;
    }
    
    globalToken = loginData.data.token;
    console.log('✅ Connexion réussie');
    console.log('👤 User:', loginData.data.user.firstName, loginData.data.user.lastName);
    console.log('🎭 Role:', loginData.data.user.role);
    console.log('🏢 Restaurant:', loginData.data.user.restaurantId?.name || '❌ MANQUANT');
    console.log('🔑 Token:', globalToken.substring(0, 30) + '...');
    
    // Étape 2: Test systématique de toutes les routes
    console.log('\n🧪 ÉTAPE 2: Test systématique des routes...\n');
    
    const routes = [
      // Auth routes
      { name: 'Auth - Me', method: 'GET', url: '/auth/me', expectData: 'user' },
      
      // User routes  
      { name: 'Users - List', method: 'GET', url: '/users', expectData: 'users' },
      
      // Restaurant routes
      { name: 'Restaurants - List', method: 'GET', url: '/restaurants', expectData: 'restaurants' },
      
      // Floor plans routes
      { name: 'Floor Plans - List', method: 'GET', url: '/floor-plans', expectData: 'floorPlans' },
      { name: 'Floor Plans - Default', method: 'GET', url: '/floor-plans/default', expectData: 'floorPlan' },
      
      // Menu routes
      { name: 'Menu - List', method: 'GET', url: '/menu', expectData: 'menuItems' },
      { name: 'Menu - Categories', method: 'GET', url: '/menu/categories', expectData: 'categories' },
      
      // Order routes
      { name: 'Orders - List', method: 'GET', url: '/orders', expectData: 'orders' },
      { name: 'Orders - Active', method: 'GET', url: '/orders/active', expectData: 'orders' },
      { name: 'Orders - Statistics', method: 'GET', url: '/orders/statistics/summary', expectData: 'summary' },
      
      // Reservation routes
      { name: 'Reservations - List', method: 'GET', url: '/reservations', expectData: 'reservations' },
      
      // Notification routes
      { name: 'Notifications - Test', method: 'POST', url: '/notifications/test', 
        body: { email: 'test@example.com' }, expectData: 'messageId' },
      
      // Health routes
      { name: 'Health Check', method: 'GET', url: '/health', auth: false },
      { name: 'API Docs', method: 'GET', url: '/docs', auth: false }
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    const failures = [];
    
    for (const route of routes) {
      try {
        console.log(`🔗 Test: ${route.name}`);
        console.log(`   📍 ${route.method} ${route.url}`);
        
        const headers = {
          'Content-Type': 'application/json'
        };
        
        // Ajouter le token d'auth si nécessaire
        if (route.auth !== false && globalToken) {
          headers['Authorization'] = `Bearer ${globalToken}`;
        }
        
        const requestOptions = {
          method: route.method,
          headers
        };
        
        // Ajouter le body pour les requêtes POST/PUT
        if (route.body && ['POST', 'PUT', 'PATCH'].includes(route.method)) {
          requestOptions.body = JSON.stringify(route.body);
        }
        
        const response = await fetch(`${API_BASE}${route.url}`, requestOptions);
        
        console.log(`   📊 Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Success: ${data.success ? 'OK' : 'ÉCHEC'}`);
          
          // Vérifier les données attendues
          if (route.expectData && data.data) {
            const hasExpectedData = route.expectData in data.data || 
                                  (Array.isArray(data.data) && data.data.length >= 0) ||
                                  route.expectData === 'messageId' && data.messageId;
            
            console.log(`   📋 Données: ${hasExpectedData ? 'Présentes' : 'Manquantes'}`);
            
            // Afficher un échantillon des données
            if (route.expectData in data.data) {
              const sample = data.data[route.expectData];
              if (Array.isArray(sample)) {
                console.log(`   📏 Taille: ${sample.length} éléments`);
              } else if (typeof sample === 'object') {
                console.log(`   🏷️ Type: Object avec ${Object.keys(sample).length} propriétés`);
              }
            }
          }
          
          passedTests++;
          console.log(`   🎯 SUCCÈS\n`);
          
        } else {
          const errorText = await response.text();
          console.log(`   ❌ ÉCHEC: ${response.status}`);
          console.log(`   📝 Erreur: ${errorText.substring(0, 100)}...`);
          
          // Analyser les erreurs d'authentification
          if (response.status === 401) {
            if (errorText.includes('jwt malformed')) {
              console.log(`   🔍 PROBLÈME: Token JWT malformé détecté`);
              console.log(`   🔑 Token utilisé: ${globalToken?.substring(0, 20)}...`);
            } else if (errorText.includes('token manquant')) {
              console.log(`   🔍 PROBLÈME: Token manquant`);
            }
          }
          
          failedTests++;
          failures.push({
            route: route.name,
            status: response.status,
            error: errorText.substring(0, 200)
          });
          console.log(`   💥 ÉCHEC\n`);
        }
        
      } catch (routeError) {
        console.log(`   💥 ERREUR RÉSEAU: ${routeError.message}\n`);
        failedTests++;
        failures.push({
          route: route.name,
          error: routeError.message
        });
      }
      
      // Petite pause entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Résumé final
    console.log('📊 RÉSUMÉ FINAL:');
    console.log(`✅ Tests réussis: ${passedTests}`);
    console.log(`❌ Tests échoués: ${failedTests}`);
    console.log(`📈 Taux de réussite: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
    
    if (failures.length > 0) {
      console.log('\n💥 ÉCHECS DÉTAILLÉS:');
      failures.forEach(failure => {
        console.log(`❌ ${failure.route}:`);
        console.log(`   ${failure.error}`);
      });
      
      console.log('\n💡 SOLUTIONS RECOMMANDÉES:');
      
      const jwtErrors = failures.filter(f => f.error.includes('jwt malformed'));
      if (jwtErrors.length > 0) {
        console.log('🔑 Problème JWT détecté:');
        console.log('   1. Redémarrez le serveur');
        console.log('   2. Vérifiez JWT_SECRET dans .env');
        console.log('   3. Testez avec un token frais');
      }
      
      const authErrors = failures.filter(f => f.status === 401);
      if (authErrors.length > 0) {
        console.log('🔐 Problèmes d\'authentification:');
        console.log('   1. Vérifiez les permissions utilisateur');
        console.log('   2. Assignez un restaurant à l\'admin');
        console.log('   3. Vérifiez le middleware auth');
      }
    } else {
      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
      console.log('🚀 Votre API Zengest est entièrement fonctionnelle !');
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
};

testAllRoutes();