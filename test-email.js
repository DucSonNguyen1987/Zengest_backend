require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Test Gmail - VERSION CORRIGÉE\n');

// Configuration Gmail correcte
const testGmail = async () => {
  try {
    console.log('📧 Configuration Gmail...');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Password longueur:', process.env.EMAIL_PASSWORD?.length);
    
    // CORRECTION: createTransport au lieu de createTransporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    console.log('🔗 Test connexion Gmail...');
    await transporter.verify();
    console.log('✅ Connexion Gmail réussie !');
    
    console.log('📤 Envoi email de test...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // À soi-même
      subject: 'Test Gmail Zengest - ' + new Date().toLocaleTimeString(),
      text: 'Si vous recevez cet email, Gmail fonctionne parfaitement avec Zengest !',
      html: `
        <h2>✅ Test Gmail réussi !</h2>
        <p>Votre configuration Gmail + Zengest fonctionne parfaitement.</p>
        <p><strong>Testé le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><em>Vous pouvez maintenant utiliser les notifications email dans Zengest !</em></p>
      `
    });
    
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Vérifiez votre boîte mail:', process.env.EMAIL_USER);
    console.log('\n🎉 GMAIL FONCTIONNE PARFAITEMENT !');
    
  } catch (error) {
    console.error('❌ Erreur Gmail:', error.message);
    
    if (error.message.includes('535')) {
      console.log('\n🔐 Problème d\'authentification persistant:');
      console.log('1. Vérifiez que la validation 2 étapes est ACTIVE');
      console.log('2. Recréez un App Password tout neuf');
      console.log('3. Vérifiez qu\'il n\'y a pas d\'activité suspecte sur votre compte');
      console.log('4. Essayez depuis un autre réseau/IP');
    }
  }
};

testGmail();