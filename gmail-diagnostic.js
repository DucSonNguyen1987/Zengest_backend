require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔬 DIAGNOSTIC AVANCÉ GMAIL\n');

const advancedGmailTest = async () => {
  // Test 1: Vérification des paramètres de sécurité Gmail
  console.log('🔐 Test 1: Paramètres de sécurité');
  console.log('Allez vérifier ces paramètres sur votre compte Gmail:');
  console.log('https://myaccount.google.com/security');
  console.log('- Validation en 2 étapes: DOIT être activée');
  console.log('- Accès moins sécurisé: DOIT être désactivé');
  console.log('- Mots de passe des applications: DOIT avoir "Zengest"');
  
  // Test 2: Différentes configurations Gmail
  const configurations = [
    {
      name: 'Gmail avec service',
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail SMTP explicite port 587',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Gmail SMTP explicite port 465',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    }
  ];
  
  console.log('\n📧 Test de différentes configurations Gmail...\n');
  
  for (const test of configurations) {
    try {
      console.log(`🔄 Test: ${test.name}`);
      const transporter = nodemailer.createTransport(test.config);
      
      await transporter.verify();
      console.log(`✅ ${test.name} fonctionne !`);
      
      // Si ça marche, essayer d'envoyer un email
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `Test ${test.name} réussi`,
        text: `Configuration ${test.name} fonctionnelle !`
      });
      
      console.log(`📧 Email envoyé avec ${test.name}:`, result.messageId);
      console.log('🎉 SOLUTION TROUVÉE !');
      return; // Arrêter si ça marche
      
    } catch (error) {
      console.log(`❌ ${test.name} échec:`, error.message.split('\n')[0]);
    }
  }
  
  console.log('\n🚨 TOUTES LES CONFIGURATIONS GMAIL ÉCHOUENT');
  console.log('\n🔍 Causes possibles:');
  console.log('1. Compte Gmail bloqué/suspendu temporairement');
  console.log('2. Trop de tentatives de connexion échouées');
  console.log('3. Restrictions géographiques/réseau');
  console.log('4. Paramètres de sécurité Gmail trop stricts');
  
  console.log('\n💡 Solutions à essayer:');
  console.log('1. Attendre 30 minutes puis réessayer');
  console.log('2. Essayer depuis un autre réseau/connexion');
  console.log('3. Vérifier l\'activité suspecte sur votre compte Gmail');
  console.log('4. Utiliser un autre service email temporairement');
  
  console.log('\n🌐 Vérifications à faire sur Gmail:');
  console.log('https://security.google.com/settings/security/activity');
  console.log('https://myaccount.google.com/security/2fa');
  console.log('https://myaccount.google.com/device-activity');
};

advancedGmailTest();