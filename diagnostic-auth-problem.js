/**
 * DIAGNOSTIC PROBLÈME AUTHENTIFICATION
 * Identifier pourquoi les routes /auth/* ne fonctionnent pas
 */

console.log('🔍 DIAGNOSTIC PROBLÈME AUTHENTIFICATION');
console.log('='.repeat(50));

const API_BASE = 'http://localhost:3000';

const testRoute = async (endpoint, method = 'GET', data = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    console.log(`🔍 Test ${method} ${endpoint}...`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await response.text();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status >= 400) {
      console.log(`   ❌ Erreur: ${text.substring(0, 200)}`);
    } else {
      console.log(`   ✅ OK: ${text.substring(0, 100)}...`);
    }
    
    return { status: response.status, text, ok: response.ok };
    
  } catch (error) {
    console.log(`   💥 ERREUR RÉSEAU: ${error.message}`);
    return { error: error.message };
  }
};

const runDiagnostic = async () => {
  console.log('🚀 Démarrage diagnostic...\n');
  
  // Test 1: Routes de base (qui fonctionnent)
  console.log('📋 1. ROUTES DE BASE (fonctionnent)');
  await testRoute('/api/health');
  await testRoute('/api/docs');
  await testRoute('/api/');
  
  // Test 2: Route auth spécifique
  console.log('\n📋 2. ROUTES AUTH (problématiques)');
  await testRoute('/api/auth');
  await testRoute('/api/auth/me');
  
  // Test 3: Route login avec données
  console.log('\n📋 3. ROUTE LOGIN DÉTAILLÉE');
  await testRoute('/api/auth/login', 'POST', {
    email: 'admin@zengest.com',
    password: 'Admin123!'
  });
  
  // Test 4: Autres routes API
  console.log('\n📋 4. AUTRES ROUTES API');
  await testRoute('/api/users');
  await testRoute('/api/restaurants');
  await testRoute('/api/orders');
  
  // Test 5: Routes inexistantes
  console.log('\n📋 5. ROUTES INEXISTANTES (pour comparaison)');
  await testRoute('/api/nonexistent');
  await testRoute('/api/auth/nonexistent');
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ANALYSE');
  console.log('='.repeat(50));
  
  console.log('✅ Les routes de base fonctionnent (/api/health, /api/docs)');
  console.log('❌ Les routes /auth/* échouent avec "fetch failed"');
  console.log('');
  console.log('🔍 CAUSES POSSIBLES:');
  console.log('1. Route /auth non montée dans app.js');
  console.log('2. Erreur dans authRoutes (src/routes/auth.js)');
  console.log('3. Problème middleware auth qui crash le serveur');
  console.log('4. Erreur dans les contrôleurs auth');
  console.log('');
  console.log('💡 VÉRIFICATIONS À FAIRE:');
  console.log('1. Vérifier app.js: app.use("/api/auth", authRoutes)');
  console.log('2. Vérifier src/routes/auth.js existe et exporte correctement');
  console.log('3. Vérifier src/controllers/authController.js');
  console.log('4. Regarder les logs du serveur pour erreurs');
  console.log('');
  console.log('🛠️ COMMANDES DIAGNOSTIC:');
  console.log('   ls src/routes/auth.js');
  console.log('   ls src/controllers/authController.js');
  console.log('   grep -n "auth" app.js');
  console.log('   npm run dev (et regarder les erreurs)');
};

runDiagnostic().catch(error => {
  console.error('💥 Erreur diagnostic:', error);
});

console.log('\n🔧 SOLUTION PROBABLE:');
console.log('Le serveur démarre partiellement mais les routes auth crashent.');
console.log('Vérifiez les fichiers auth manquants ou corrompus.');
console.log('Regardez les logs du serveur au démarrage pour voir les erreurs.');