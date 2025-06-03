require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔬 Gmail - Dernière tentative avec paramètres alternatifs\n');

const gmailLastAttempt = async () => {
  const configurations = [
    {
      name: 'Gmail SMTP port 587 avec TLS forcé',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          ciphers: 'SSLv3'
        }
      }
    },
    {
      name: 'Gmail SMTP port 465 SSL',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail avec OAuth2 simulé',
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];
  
  console.log('🔍 Informations de débogage :');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD longueur:', process.env.EMAIL_PASSWORD?.length);
  console.log('App Password début:', process.env.EMAIL_PASSWORD?.substring(0, 4) + '...');
  console.log('');
  
  for (const test of configurations) {
    try {
      console.log(`🔄 Test: ${test.name}`);
      
      const transporter = nodemailer.createTransport(test.config);
      
      // Test de vérification avec timeout
      console.log('  📡 Vérification connexion (timeout 30s)...');
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout 30s')), 30000)
        )
      ]);
      
      console.log(`  ✅ ${test.name} - Connexion réussie !`);
      
      // Test d'envoi
      console.log('  📧 Envoi email...');
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `Gmail enfin fonctionnel ! - ${new Date().toLocaleTimeString()}`,
        text: `Excellente nouvelle ! Gmail fonctionne avec la configuration: ${test.name}`,
        html: `<h2>🎉 Gmail fonctionne enfin !</h2><p>Configuration réussie: <strong>${test.name}</strong></p>`
      });
      
      console.log(`  📧 Email envoyé ! ID: ${result.messageId}`);
      console.log(`\n🎉 GMAIL FONCTIONNE AVEC: ${test.name}`);
      console.log('📬 Vérifiez votre Gmail !');
      
      console.log('\n📋 Configuration à utiliser dans email.js :');
      console.log(JSON.stringify(test.config, null, 2));
      
      return true;
      
    } catch (error) {
      console.log(`  ❌ ${test.name} échec: ${error.message.split('\n')[0]}`);
    }
    console.log('');
  }
  
  console.log('🚨 TOUTES LES CONFIGURATIONS GMAIL ÉCHOUENT');
  console.log('\n🎯 RECOMMANDATION FINALE:');
  console.log('1. 🚀 Utilisez Outlook (créez un compte en 2 minutes)');
  console.log('2. 🔄 Ou attendez 30 minutes et réessayez Gmail');
  console.log('3. 🌐 Ou essayez depuis un autre réseau/IP');
  console.log('4. 📧 Ou utilisez un autre compte Gmail de test');
  
  console.log('\n💡 Gmail peut avoir des restrictions temporaires sur votre compte/IP');
  
  return false;
};

gmailLastAttempt();