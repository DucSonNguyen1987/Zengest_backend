const nodemailer = require('nodemailer');

console.log('🚀 Test Outlook - Configuration temporaire\n');

const testOutlookDirect = async () => {
  // Configuration avec un compte de test Outlook
  // (vous devrez créer ce compte ou utiliser le vôtre)
  
  console.log('📧 Test avec configuration Outlook...');
  
  // Si vous n'avez pas encore de compte Outlook, ce test va échouer
  // mais vous verrez que la configuration est correcte
  const outlookConfig = {
    service: 'hotmail', // ou 'outlook'
    auth: {
      user: 'duc.son.nguyen48@gmail.com', // Remplacez par votre vrai compte
      pass: 'Kinshasa1987'        // Remplacez par votre vrai mot de passe
    }
  };
  
  // Vérifiez si la configuration est mise à jour
  if (outlookConfig.auth.user === 'votre.compte@outlook.com') {
    console.log('⚠️  Pour tester Outlook, vous devez :');
    console.log('1. Créer un compte gratuit sur outlook.com');
    console.log('2. Modifier les valeurs dans ce fichier');
    console.log('3. Ou directement modifier votre .env avec :');
    console.log('');
    console.log('EMAIL_SERVICE=outlook');
    console.log('EMAIL_USER=votre.nouveau@outlook.com');
    console.log('EMAIL_PASSWORD=votre_mot_de_passe_outlook');
    console.log('');
    console.log('💡 Outlook est BEAUCOUP plus simple que Gmail !');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport(outlookConfig);
    
    console.log('🔗 Test connexion Outlook...');
    await transporter.verify();
    console.log('✅ Outlook connecté avec succès !');
    
    console.log('📤 Envoi email de test...');
    const result = await transporter.sendMail({
      from: outlookConfig.auth.user,
      to: 'duc.son.nguyen48l@gmail.com', // Votre Gmail pour recevoir le test
      subject: '🎉 Zengest - Outlook fonctionne parfaitement !',
      text: 'Félicitations ! Outlook est configuré et fonctionne avec Zengest.',
      html: `
        <h2 style="color: #0078d4;">🎉 Zengest + Outlook = Success !</h2>
        <p>Excellente nouvelle ! Votre configuration Outlook fonctionne parfaitement.</p>
        <div style="background: #f3f2f1; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>✅ Configuration validée :</h3>
          <ul>
            <li>Service : Outlook/Hotmail</li>
            <li>Connexion : Réussie</li>
            <li>Envoi d'email : Fonctionnel</li>
          </ul>
        </div>
        <p><strong>Prochaine étape :</strong> Intégrer dans votre application Zengest !</p>
        <p><em>Test réalisé le ${new Date().toLocaleString('fr-FR')}</em></p>
      `
    });
    
    console.log('✅ Email Outlook envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Vérifiez votre Gmail : duc.son.nguyen48l@gmail.com');
    console.log('\n🎯 OUTLOOK FONCTIONNE PARFAITEMENT !');
    console.log('💡 Utilisez cette configuration dans votre .env');
    
  } catch (error) {
    console.error('❌ Erreur Outlook:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔑 Vérifiez vos identifiants Outlook');
    } else {
      console.log('\n🚨 Erreur inattendue avec Outlook');
    }
  }
};

testOutlookDirect();