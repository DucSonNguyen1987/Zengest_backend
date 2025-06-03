require('dotenv').config();

console.log('🔧 Test correction JWT\n');

// Test 1: Vérifier la configuration
try {
  const config = require('./src/config/config');
  console.log('✅ Configuration chargée');
  console.log('JWT_SECRET défini:', !!config.jwtSecret);
  console.log('JWT_EXPIRE (corrigé):', `"${config.jwtExpire}"`);
  console.log('Type:', typeof config.jwtExpire);
} catch (error) {
  console.error('❌ Erreur config:', error.message);
  process.exit(1);
}

// Test 2: Simuler generateToken
try {
  const jwt = require('jsonwebtoken');
  const config = require('./src/config/config');
  
  console.log('\n🔑 Test génération token...');
  
  // Simulation de la fonction dans authController
  const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, {
      expiresIn: config.jwtExpire // ✅ Utilise maintenant config.jwtExpire
    });
  };
  
  const testToken = generateToken('test123');
  console.log('✅ Token généré avec succès !');
  console.log('Token:', testToken.substring(0, 50) + '...');
  
  // Vérifier le token
  const decoded = jwt.verify(testToken, config.jwtSecret);
  console.log('✅ Token vérifié, payload:', decoded);
  
} catch (error) {
  console.error('❌ Erreur génération token:', error.message);
  process.exit(1);
}

// Test 3: Test de connexion
console.log('\n🔐 Test connexion API...');

const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@zengest.com',
        password: 'Admin123!'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Connexion API réussie !');
      console.log('👤 Utilisateur:', data.data.user.firstName, data.data.user.lastName);
      console.log('🔑 Token obtenu:', data.data.token.substring(0, 30) + '...');
      
      // Test l'endpoint de notification
      console.log('\n📧 Test notification...');
      const notifResponse = await fetch('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.data.token}`
        },
        body: JSON.stringify({
          email: 'duc.son.nguyen48l@gmail.com'
        })
      });
      
      const notifData = await notifResponse.json();
      if (notifData.success) {
        console.log('✅ Email envoyé via Brevo !');
        console.log('📧 Message ID:', notifData.messageId);
        console.log('\n🎉 TOUT FONCTIONNE PARFAITEMENT !');
      } else {
        console.log('⚠️ Email échoué:', notifData.message);
      }
      
    } else {
      console.error('❌ Connexion échouée:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message);
    console.log('💡 Vérifiez que le serveur est démarré : npm run dev');
  }
};

// Lancer le test de connexion
testLogin();