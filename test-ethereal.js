const nodemailer = require('nodemailer');

console.log('🧪 Test Ethereal Email - SERVICE DE TEST GRATUIT\n');

const testEthereal = async () => {
  try {
    console.log('⚡ Création d\'un compte de test temporaire...');
    
    // Créer automatiquement un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Compte test créé automatiquement:');
    console.log('📧 Email:', testAccount.user);
    console.log('🔑 Password:', testAccount.pass);
    console.log('🌐 SMTP:', testAccount.smtp.host + ':' + testAccount.smtp.port);
    
    // CORRECTION: createTransport au lieu de createTransporter
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('\n📧 Test envoi email...');
    
    const result = await transporter.sendMail({
      from: '"Zengest Restaurant 🍽️" <zengest@test.com>',
      to: 'duc.son.nguyen48l@gmail.com',
      subject: '✅ Test Zengest - Nodemailer fonctionne parfaitement !',
      text: 'Si vous voyez ce message, votre configuration Nodemailer fonctionne à 100% !',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎉 Zengest - Test réussi !</h2>
          <p>Félicitations ! Votre configuration <strong>Nodemailer</strong> fonctionne parfaitement.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📊 Résultats du test :</h3>
            <ul>
              <li>✅ <strong>Nodemailer :</strong> Fonctionne parfaitement</li>
              <li>✅ <strong>Connexion SMTP :</strong> Établie avec succès</li>
              <li>✅ <strong>Envoi d'email :</strong> Réussi</li>
              <li>⚠️ <strong>Gmail :</strong> À résoudre séparément</li>
            </ul>
          </div>
          
          <p><strong>Prochaines étapes :</strong></p>
          <ol>
            <li>Résoudre le problème Gmail spécifique</li>
            <li>Ou utiliser Outlook temporairement</li>
            <li>Intégrer dans votre application Zengest</li>
          </ol>
          
          <p><em>Test effectué le ${new Date().toLocaleString('fr-FR')}</em></p>
          <p>🚀 <strong>Zengest Restaurant Management System</strong></p>
        </div>
      `
    });
    
    console.log('✅ Email de test envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    
    // Lien pour voir l'email dans le navigateur
    const previewUrl = nodemailer.getTestMessageUrl(result);
    console.log('\n🌐 VOIR L\'EMAIL DANS LE NAVIGATEUR:');
    console.log(previewUrl);
    console.log('\n👆 Copiez ce lien dans votre navigateur pour voir l\'email !');
    
    console.log('\n🎯 CONCLUSION:');
    console.log('✅ Nodemailer fonctionne parfaitement');
    console.log('✅ Votre code est correct');
    console.log('⚠️ Le problème vient spécifiquement de Gmail');
    console.log('💡 Solution : Utilisez Outlook ou résolvez Gmail');
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.log('🚨 Si Ethereal échoue aussi, il y a un problème plus profond');
  }
};

testEthereal();