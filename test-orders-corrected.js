console.log('🧪 Test après correction OrderController');

const testCorrectedOrders = async () => {
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
      console.error('❌ Connexion échouée');
      return;
    }
    
    console.log('✅ Connecté');
    
    // Test de la route corrigée
    const ordersResponse = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${loginData.data.token}` }
    });
    
    console.log('📊 Status /orders:', ordersResponse.status);
    
    if (ordersResponse.ok) {
      const data = await ordersResponse.json();
      console.log('🎉 SUCCESS! Route /orders corrigée!');
      console.log('📄 Résultat:', {
        success: data.success,
        ordersCount: data.data?.orders?.length || 0,
        pagination: data.data?.pagination,
        filters: !!data.data?.filters,
        summary: !!data.data?.summary
      });
      
      console.log('\n✅ PROBLÈME RÉSOLU !');
      console.log('🚀 Votre API fonctionne maintenant parfaitement');
      
    } else {
      const errorText = await ordersResponse.text();
      console.log('❌ Erreur persistante:', errorText);
      console.log('💡 Redémarrez le serveur: npm run dev');
    }
    
  } catch (error) {
    console.error('💥 Erreur test:', error.message);
  }
};

testCorrectedOrders();