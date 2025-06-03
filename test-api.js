console.log('🧪 Test API Zengest - Version simple sans curl\n');

const API_BASE = 'http://localhost:3000/api';

const testAPI = async () => {
  try {
    // Test 1: Connexion
    console.log('🔐 Test connexion...');
    
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
    
    console.log('Status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erreur HTTP:', loginResponse.status);
      console.error('Response:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Erreur connexion:', loginData.message);
      return;
    }
    
    console.log('✅ Connexion réussie !');
    console.log('👤 Utilisateur:', loginData.data.user.firstName, loginData.data.user.lastName);
    console.log('🎭 Rôle:', loginData.data.user.role);
    console.log('🔑 Token obtenu:', loginData.data.token.substring(0, 30) + '...');
    
    // Test 2: Email de test
    console.log('\n📧 Test email via Brevo...');
    
    const emailResponse = await fetch(`${API_BASE}/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.data.token}`
      },
      body: JSON.stringify({
        email: 'duc.son.nguyen48l@gmail.com'
      })
    });
    
    console.log('Status email:', emailResponse.status);
    
    const emailData = await emailResponse.json();
    
    if (emailData.success) {
      console.log('✅ Email envoyé avec succès via Brevo !');
      console.log('📧 Message ID:', emailData.messageId || 'N/A');
      console.log('📬 Vérifiez votre Gmail : duc.son.nguyen48l@gmail.com');
      console.log('\n🎉 SYSTÈME COMPLET FONCTIONNEL !');
      
      console.log('\n📊 Résumé:');
      console.log('✅ Authentification JWT : OK');
      console.log('✅ Email Brevo : OK');
      console.log('✅ API Zengest : OK');
      console.log('🌐 Dashboard Brevo : https://app.brevo.com');
      
    } else {
      console.error('❌ Erreur email:', emailData.message);
      
      if (emailData.message.includes('non configuré')) {
        console.log('\n💡 Problème configuration email:');
        console.log('1. Vérifiez votre .env (Brevo)');
        console.log('2. Redémarrez le serveur');
      }
    }
    
    // Test 3: Informations utilisateur
    console.log('\n👤 Test informations utilisateur...');
    
    const meResponse = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.data.token}`
      }
    });
    
    const meData = await meResponse.json();
    
    if (meData.success) {
      console.log('✅ Profil utilisateur récupéré');
      console.log('📧 Email:', meData.data.user.email);
      console.log('🏢 Restaurant:', meData.data.user.restaurantId?.name || 'N/A');
      console.log('🔐 Permissions:', meData.data.permissions?.length || 0, 'permissions');
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message);
    console.log('\n💡 Vérifications:');
    console.log('1. Serveur démarré ? npm run dev');
    console.log('2. Port 3000 disponible ?');
    console.log('3. Configuration .env correcte ?');
  }
};

// Fonction pour installer node-fetch si nécessaire
const checkAndInstallFetch = () => {
  try {
    require('node-fetch');
  } catch (error) {
    console.log('⚠️  node-fetch non installé, utilisation de fetch natif');
    
    // Pour Node.js 18+ qui a fetch intégré
    if (typeof fetch === 'undefined') {
      console.error('❌ fetch non disponible. Installez node-fetch :');
      console.log('npm install node-fetch');
      process.exit(1);
    }
  }
};

// Vérifier fetch et lancer le test
checkAndInstallFetch();
testAPI();