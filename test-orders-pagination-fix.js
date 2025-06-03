
console.log('🧪 Test correction pagination /orders');

const testOrdersFixed = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion
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
    
    console.log('✅ Connexion réussie');
    
    // Test de la route corrigée
    console.log('\n📋 Test /orders avec pagination par défaut...');
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${loginData.data.token}` }
    });
    
    console.log('📊 Status:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      console.log('✅ SUCCESS ! Bug pagination corrigé');
      console.log('📄 Résultat:', {
        success: data.success,
        ordersCount: data.data?.orders?.length || 0,
        pagination: data.data?.pagination,
        currentPage: data.data?.pagination?.currentPage,
        totalPages: data.data?.pagination?.totalPages
      });
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ ÉCHEC persistant:', errorText);
    }
    
    // Test avec paramètres de pagination
    console.log('\n📋 Test /orders avec pagination explicite...');
    const ordersWithParamsResponse = await fetch(`${API_BASE}/orders?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${loginData.data.token}` }
    });
    
    console.log('📊 Status avec params:', ordersWithParamsResponse.status);
    
    if (ordersWithParamsResponse.ok) {
      const data = await ordersWithParamsResponse.json();
      console.log('✅ Pagination explicite fonctionne');
      console.log('📄 Limit respecté:', data.data?.pagination?.limit === 5);
    }
    
  } catch (error) {
    console.error('💥 Erreur test:', error.message);
  }
};

testOrdersFixed();
