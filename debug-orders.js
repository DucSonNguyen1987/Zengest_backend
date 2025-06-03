console.log('🔍 Diagnostic erreur route /orders\n');

const API_BASE = 'http://localhost:3000/api';

const debugOrdersError = async () => {
  try {
    // Étape 1: Connexion pour obtenir un token
    console.log('🔐 Connexion pour obtenir un token...');
    
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('❌ Échec connexion');
      return;
    }
    
    const token = loginData.data.token;
    console.log('✅ Token obtenu');
    
    // Étape 2: Test détaillé de la route /orders
    console.log('\n🧪 Test détaillé route /orders...');
    
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status:', ordersResponse.status);
    console.log('📋 Headers:', Object.fromEntries(ordersResponse.headers.entries()));
    
    const responseText = await ordersResponse.text();
    console.log('📝 Response brute:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('📄 Response JSON:', responseJson);
      
      if (!responseJson.success && responseJson.message) {
        console.log('❌ Message d\'erreur:', responseJson.message);
      }
    } catch (parseError) {
      console.log('⚠️ Response non-JSON:', responseText.substring(0, 200));
    }
    
    // Étape 3: Tester d'autres routes similaires pour comparaison
    console.log('\n🔄 Test routes similaires pour comparaison...');
    
    const similarRoutes = [
      { name: 'Orders Active', url: '/orders/active' },
      { name: 'Orders Statistics', url: '/orders/statistics/summary' },
      { name: 'Menu', url: '/menu' },
      { name: 'Reservations', url: '/reservations' }
    ];
    
    for (const route of similarRoutes) {
      try {
        const response = await fetch(`${API_BASE}${route.url}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`📍 ${route.name}: ${response.status} ${response.ok ? '✅' : '❌'}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`   Erreur: ${errorText.substring(0, 100)}`);
        }
      } catch (error) {
        console.log(`📍 ${route.name}: ❌ ${error.message}`);
      }
    }
    
    // Étape 4: Vérifier la structure de la base de données
    console.log('\n🗄️ Test base de données (via API)...');
    
    try {
      // Test avec des paramètres pour voir si c'est un problème de query
      const ordersWithParamsResponse = await fetch(`${API_BASE}/orders?page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📊 Orders avec params:', ordersWithParamsResponse.status);
      
      if (!ordersWithParamsResponse.ok) {
        const errorText = await ordersWithParamsResponse.text();
        console.log('❌ Erreur avec params:', errorText);
      }
    } catch (error) {
      console.log('❌ Erreur test avec params:', error.message);
    }
    
    // Étape 5: Vérifier les logs serveur en temps réel
    console.log('\n📋 RECOMMANDATIONS DE DÉBOGAGE:');
    console.log('1. Vérifiez les logs du serveur dans le terminal où npm run dev tourne');
    console.log('2. Cherchez les erreurs de stack trace');
    console.log('3. Vérifiez si le modèle Order existe et est correctement importé');
    console.log('4. Vérifiez les permissions et le middleware auth');
    console.log('5. Vérifiez la connexion MongoDB');
    
    console.log('\n🔧 SOLUTIONS POSSIBLES:');
    console.log('1. Méthode getAllOrders manquante dans OrderController');
    console.log('2. Route mal configurée dans routes/orders.js');
    console.log('3. Problème de modèle Order ou de schéma MongoDB');
    console.log('4. Erreur dans le middleware de pagination');
    console.log('5. Problème de permissions utilisateur');
    
  } catch (error) {
    console.error('💥 Erreur diagnostic:', error.message);
  }
};

debugOrdersError();