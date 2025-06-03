console.log('🧪 Test route /orders avec utilisateur STAFF\n');

const testOrdersWithStaff = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion avec différents types de staff
    const staffAccounts = [
      {
        name: 'Sophie (Staff Salle)',
        email: 'sophie.salle@bistrot-zengest.com',
        password: 'Staff123!',
        role: 'STAFF_FLOOR'
      },
      {
        name: 'Pierre (Staff Bar)', 
        email: 'pierre.bar@bistrot-zengest.com',
        password: 'Staff123!',
        role: 'STAFF_BAR'
      },
      {
        name: 'Paul (Staff Cuisine)',
        email: 'paul.cuisine@bistrot-zengest.com', 
        password: 'Staff123!',
        role: 'STAFF_KITCHEN'
      }
    ];

    for (const staff of staffAccounts) {
      console.log(`\n👥 Test avec ${staff.name} (${staff.role})`);
      
      try {
        // Connexion
        console.log('🔐 Connexion...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: staff.email,
            password: staff.password
          })
        });
        
        if (!loginResponse.ok) {
          console.log(`❌ Connexion échouée pour ${staff.name}: ${loginResponse.status}`);
          continue;
        }
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
          console.error(`❌ Connexion échouée pour ${staff.name}:`, loginData.message);
          continue;
        }
        
        const token = loginData.data.token;
        console.log('✅ Connecté en tant que:', loginData.data.user.firstName, loginData.data.user.lastName);
        console.log('🎭 Rôle:', loginData.data.user.role);
        console.log('🏢 Restaurant:', loginData.data.user.restaurantId?.name || '❌ MANQUANT');
        
        // Test de la route /orders
        console.log('\n📋 Test /orders...');
        const ordersResponse = await fetch(`${API_BASE}/orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Status:', ordersResponse.status);
        
        if (ordersResponse.ok) {
          const data = await ordersResponse.json();
          console.log('✅ SUCCESS! Route /orders fonctionne');
          console.log('📄 Structure:', {
            success: data.success,
            ordersCount: data.data?.orders?.length || 0,
            pagination: !!data.data?.pagination,
            filters: !!data.data?.filters
          });
          
          // Vérifications spécifiques pour staff
          if (data.data?.orders?.length > 0) {
            const firstOrder = data.data.orders[0];
            console.log('📋 Première commande:', {
              id: firstOrder._id || firstOrder.id,
              status: firstOrder.status,
              restaurantId: firstOrder.restaurantId?._id || firstOrder.restaurantId,
              assignedServer: firstOrder.assignedServer?.firstName || 'N/A'
            });
            
            // Vérifier que le staff ne voit que les commandes de son restaurant
            const userRestaurantId = loginData.data.user.restaurantId?._id;
            if (userRestaurantId) {
              const allSameRestaurant = data.data.orders.every(order => 
                (order.restaurantId?._id || order.restaurantId) === userRestaurantId
              );
              console.log('🔒 Filtrage restaurant:', allSameRestaurant ? '✅ Correct' : '❌ Problème sécurité');
            }
          } else {
            console.log('📋 Aucune commande trouvée (normal si base vide)');
          }
          
        } else {
          const errorText = await ordersResponse.text();
          console.log('❌ ÉCHEC - Status:', ordersResponse.status);
          console.log('📝 Erreur:', errorText.substring(0, 200));
          
          if (ordersResponse.status === 403) {
            console.log('💡 Erreur 403: Problème de permissions staff');
          } else if (ordersResponse.status === 500) {
            console.log('💡 Erreur 500: Problème serveur (même que pour admin)');
          }
        }
        
        // Test rapide d'autres routes pour comparaison
        console.log('\n🔄 Test autres routes orders...');
        
        const otherRoutes = [
          { name: 'orders/active', url: '/orders/active' },
          { name: 'orders/statistics', url: '/orders/statistics/summary' }
        ];
        
        for (const route of otherRoutes) {
          try {
            const response = await fetch(`${API_BASE}${route.url}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`   📍 ${route.name}: ${response.status} ${response.ok ? '✅' : '❌'}`);
          } catch (error) {
            console.log(`   📍 ${route.name}: ❌ ${error.message}`);
          }
        }
        
        // Test des permissions - essayer d'accéder aux routes admin
        console.log('\n🔒 Test permissions (accès routes admin):');
        
        const adminRoutes = [
          { name: 'users', url: '/users' },
          { name: 'restaurants', url: '/restaurants' }
        ];
        
        for (const route of adminRoutes) {
          try {
            const response = await fetch(`${API_BASE}${route.url}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 403) {
              console.log(`   🔒 ${route.name}: ✅ Accès refusé (sécurité OK)`);
            } else if (response.ok) {
              console.log(`   🔒 ${route.name}: ⚠️ Accès autorisé (à vérifier)`);
            } else {
              console.log(`   🔒 ${route.name}: ${response.status} (autre erreur)`);
            }
          } catch (error) {
            console.log(`   🔒 ${route.name}: ❌ ${error.message}`);
          }
        }
        
      } catch (staffError) {
        console.error(`💥 Erreur avec ${staff.name}:`, staffError.message);
      }
      
      console.log('─'.repeat(50));
    }
    
    console.log('\n📊 RÉSUMÉ TEST STAFF:');
    console.log('✅ Test des 3 types de staff (salle, bar, cuisine)');
    console.log('🔒 Vérification du filtrage par restaurant');
    console.log('🛡️ Test des permissions (staff vs admin)');
    console.log('📋 Comparaison routes orders');
    
    console.log('\n💡 POINTS À VÉRIFIER:');
    console.log('1. Staff peut voir les commandes de son restaurant uniquement');
    console.log('2. Staff ne peut pas accéder aux routes admin (/users, /restaurants)');
    console.log('3. Toutes les routes /orders/* fonctionnent pour le staff');
    console.log('4. Permissions différentes selon le rôle staff');
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
    console.log('💡 Vérifiez que le serveur tourne: npm run dev');
    console.log('💡 Vérifiez que les données ont été seedées: npm run seed');
  }
};

testOrdersWithStaff();