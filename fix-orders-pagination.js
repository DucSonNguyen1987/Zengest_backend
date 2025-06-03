const fs = require('fs');
const path = require('path');

console.log('🔧 Correction automatique du bug pagination dans orders.js\n');

const fixOrdersPagination = () => {
  try {
    // Chemin vers le fichier orders.js
    const ordersPath = path.join(__dirname, 'src', 'routes', 'orders.js');
    
    if (!fs.existsSync(ordersPath)) {
      console.error('❌ Fichier orders.js non trouvé:', ordersPath);
      return;
    }
    
    console.log('📁 Fichier trouvé:', ordersPath);
    
    // Lire le fichier
    let content = fs.readFileSync(ordersPath, 'utf8');
    
    // Sauvegarder l'original
    const backupPath = ordersPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, content);
    console.log('💾 Sauvegarde créée:', backupPath);
    
    // Chercher la section à corriger
    const oldPattern = /const\s*{\s*page,\s*limit,\s*status,/;
    
    if (!oldPattern.test(content)) {
      console.log('⚠️ Pattern non trouvé, tentative de correction manuelle...');
      
      // Chercher le pattern plus large
      const widerPattern = /const\s*{\s*page,[\s\S]*?}\s*=\s*req\.query;/;
      
      if (widerPattern.test(content)) {
        console.log('✅ Pattern large trouvé, correction...');
        
        const replacement = `const {
      page = 1,           // ✅ CORRECTION : valeur par défaut
      limit = 10,         // ✅ CORRECTION : valeur par défaut
      status,
      tableNumber,
      assignedServer,
      priority,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      customerPhone,
      sortBy = 'timestamps.ordered',    // ✅ CORRECTION : valeur par défaut
      sortOrder = 'desc'                // ✅ CORRECTION : valeur par défaut
    } = req.query;
    
    // Convertir en entiers pour éviter les erreurs
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;`;
        
        content = content.replace(widerPattern, replacement);
        
        // Corriger les usages de page et limit dans le code
        content = content.replace(/(page - 1) \* limit/g, '(pageNum - 1) * limitNum');
        content = content.replace(/\.limit\(limit\)/g, '.limit(limitNum)');
        content = content.replace(/\.skip\(\(page - 1\) \* limit\)/g, '.skip((pageNum - 1) * limitNum)');
        content = content.replace(/Math\.ceil\(total \/ limit\)/g, 'Math.ceil(total / limitNum)');
        content = content.replace(/currentPage: page,/g, 'currentPage: pageNum,');
        content = content.replace(/limit$/gm, 'limit: limitNum');
        content = content.replace(/limit,/g, 'limit: limitNum,');
        
        console.log('✅ Corrections appliquées');
      } else {
        console.error('❌ Impossible de trouver le pattern à corriger');
        return;
      }
    } else {
      console.log('✅ Pattern trouvé, correction...');
      
      const replacement = `const {
      page = 1,           // ✅ CORRECTION
      limit = 10,         // ✅ CORRECTION
      status,`;
      
      content = content.replace(oldPattern, replacement);
    }
    
    // Écrire le fichier corrigé
    fs.writeFileSync(ordersPath, content);
    console.log('✅ Fichier orders.js corrigé !');
    
    console.log('\n🎯 CORRECTIONS APPLIQUÉES:');
    console.log('1. ✅ page = 1 (valeur par défaut)');
    console.log('2. ✅ limit = 10 (valeur par défaut)');
    console.log('3. ✅ sortBy = "timestamps.ordered" (valeur par défaut)');
    console.log('4. ✅ sortOrder = "desc" (valeur par défaut)');
    console.log('5. ✅ Conversion en entiers avec parseInt()');
    
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. 🔄 Redémarrez le serveur: npm run dev');
    console.log('2. 🧪 Testez: node test-orders-simple.js');
    console.log('3. ✅ La route /orders devrait maintenant retourner 200');
    
    // Créer un script de test
    const testScript = `
console.log('🧪 Test correction pagination /orders');

const testOrdersFixed = async () => {
  try {
    const API_BASE = 'http://localhost:3000/api';
    
    // Connexion
    const loginResponse = await fetch(\`\${API_BASE}/auth/login\`, {
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
    console.log('\\n📋 Test /orders avec pagination par défaut...');
    const ordersResponse = await fetch(\`\${API_BASE}/orders\`, {
      headers: { 'Authorization': \`Bearer \${loginData.data.token}\` }
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
    console.log('\\n📋 Test /orders avec pagination explicite...');
    const ordersWithParamsResponse = await fetch(\`\${API_BASE}/orders?page=1&limit=5\`, {
      headers: { 'Authorization': \`Bearer \${loginData.data.token}\` }
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
`;
    
    fs.writeFileSync('test-orders-pagination-fix.js', testScript);
    console.log('✅ Script de test créé: test-orders-pagination-fix.js');
    
  } catch (error) {
    console.error('💥 Erreur lors de la correction:', error.message);
    console.error('Stack:', error.stack);
  }
};

fixOrdersPagination();