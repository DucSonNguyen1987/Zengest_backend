console.log('🔍 Diagnostic Token JWT - Recherche du problème\n');

const API_BASE = 'http://localhost:3000/api';

const diagnoseToklenIssue = async () => {
  try {
    // Étape 1: Connexion pour obtenir un token frais
    console.log('🔐 Étape 1: Obtenir un token frais...');
    
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
    
    const token = loginData.data.token;
    console.log('✅ Token obtenu');
    console.log('📏 Longueur:', token.length);
    console.log('🔤 Début:', token.substring(0, 50) + '...');
    console.log('🔤 Fin:', '...' + token.substring(token.length - 20));
    
    // Étape 2: Vérifier la structure du token
    console.log('\n🔍 Étape 2: Analyse structure token...');
    const parts = token.split('.');
    console.log('📊 Parties du token:', parts.length, '(doit être 3)');
    
    if (parts.length === 3) {
      try {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        
        console.log('✅ Header:', header);
        console.log('✅ Payload:', payload);
        console.log('📅 Expires:', new Date(payload.exp * 1000).toLocaleString());
      } catch (parseError) {
        console.error('❌ Erreur parsing token:', parseError.message);
      }
    }
    
    // Étape 3: Tester chaque endpoint individuellement
    console.log('\n🧪 Étape 3: Test endpoints avec le même token...');
    
    const endpoints = [
      { name: 'Auth Me', url: '/auth/me', method: 'GET' },
      { name: 'Menu', url: '/menu', method: 'GET' },
      { name: 'Floor Plans', url: '/floor-plans', method: 'GET' },
      { name: 'Restaurants', url: '/restaurants', method: 'GET' },
      { name: 'Users', url: '/users', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔗 Test: ${endpoint.name} (${endpoint.method} ${endpoint.url})`);
        
        const response = await fetch(`${API_BASE}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   📊 Status: ${response.status}`);
        
        if (response.status === 401) {
          const errorText = await response.text();
          console.log(`   ❌ Erreur 401:`, errorText);
        } else if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Succès:`, data.success ? 'OK' : 'Échec');
          
          if (data.data) {
            if (Array.isArray(data.data)) {
              console.log(`   📋 Données: ${data.data.length} éléments`);
            } else if (data.data.user) {
              console.log(`   👤 User: ${data.data.user.firstName} ${data.data.user.lastName}`);
            }
          }
        } else {
          const errorData = await response.text();
          console.log(`   ⚠️ Status ${response.status}:`, errorData.substring(0, 100));
        }
        
      } catch (endpointError) {
        console.log(`   ❌ Erreur réseau: ${endpointError.message}`);
      }
    }
    
    // Étape 4: Test avec un nouveau token pour floor-plans spécifiquement
    console.log('\n🎯 Étape 4: Test spécifique floor-plans avec nouveau token...');
    
    const newLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    const newLoginData = await newLoginResponse.json();
    const newToken = newLoginData.data.token;
    
    console.log('🔄 Nouveau token généré');
    console.log('🔍 Identique au précédent?', token === newToken ? 'Oui' : 'Non');
    
    const floorPlansResponse = await fetch(`${API_BASE}/floor-plans`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Floor-plans avec nouveau token:', floorPlansResponse.status);
    
    if (floorPlansResponse.ok) {
      const floorPlansData = await floorPlansResponse.json();
      console.log('✅ Floor-plans accessible !');
      console.log('📋 Plans:', floorPlansData.data?.floorPlans?.length || 0);
    } else {
      const errorText = await floorPlansResponse.text();
      console.log('❌ Toujours échoue:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Erreur générale:', error.message);
  }
};

diagnoseToklenIssue();