require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🚀 Test Brevo (ex-Sendinblue) - Service SMTP professionnel\n');

const testBrevo = async () => {
  try {
    console.log('📧 Configuration Brevo...');
    console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp-relay.brevo.com');
    console.log('SMTP Port:', process.env.SMTP_PORT || '587');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Password configuré:', !!process.env.EMAIL_PASSWORD);
    
    // Configuration Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true pour port 465, false pour autres ports
      auth: {
        user: process.env.EMAIL_USER, // Votre email d'inscription Brevo
        pass: process.env.EMAIL_PASSWORD // Votre clé SMTP Brevo
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔗 Test connexion Brevo...');
    await transporter.verify();
    console.log('✅ Connexion Brevo réussie !');
    
    console.log('📤 Envoi email de test...');
    const result = await transporter.sendMail({
      from: {
        name: 'Zengest Restaurant',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: 'duc.son.nguyen48l@gmail.com',
      subject: '🎉 Zengest + Brevo - Configuration réussie !',
      text: `
Félicitations !

Votre configuration Brevo (ex-Sendinblue) fonctionne parfaitement avec Zengest.

✅ Connexion SMTP établie
✅ Email envoyé avec succès
✅ Service fiable pour la production

Vous pouvez maintenant utiliser Brevo pour :
- Confirmations de réservation
- Rappels automatiques
- Notifications système
- Emails marketing

Test effectué le ${new Date().toLocaleString('fr-FR')}

L'équipe Zengest
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0066cc; text-align: center;">🎉 Zengest + Brevo</h2>
          <h3 style="color: #333;">Configuration réussie !</h3>
          
          <p>Félicitations ! Votre configuration <strong>Brevo</strong> (ex-Sendinblue) fonctionne parfaitement avec Zengest.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066cc;">
            <h4 style="margin-top: 0; color: #0066cc;">✅ Résultats du test :</h4>
            <ul style="margin: 10px 0;">
              <li>✅ <strong>Connexion SMTP :</strong> Établie avec succès</li>
              <li>✅ <strong>Authentification :</strong> Validée</li>
              <li>✅ <strong>Envoi d'email :</strong> Fonctionnel</li>
              <li>✅ <strong>Service :</strong> Prêt pour la production</li>
            </ul>
          </div>
          
          <h4 style="color: #333;">🚀 Vous pouvez maintenant utiliser Brevo pour :</h4>
          <ul>
            <li>📧 Confirmations de réservation</li>
            <li>⏰ Rappels automatiques</li>
            <li>🔔 Notifications système</li>
            <li>📈 Emails marketing</li>
          </ul>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #28a745;">💡 Avantages Brevo :</h4>
            <ul style="margin: 10px 0;">
              <li>🆓 <strong>Gratuit</strong> jusqu'à 300 emails/jour</li>
              <li>📊 <strong>Interface web</strong> pour suivre les envois</li>
              <li>⚡ <strong>Livraison rapide</strong> et fiable</li>
              <li>🔒 <strong>Sécurisé</strong> et conforme RGPD</li>
            </ul>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <em>Test effectué le ${new Date().toLocaleString('fr-FR')}</em><br>
            <strong>🏪 Zengest Restaurant Management System</strong>
          </p>
        </div>
      `
    });
    
    console.log('✅ Email Brevo envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Vérifiez votre Gmail : duc.son.nguyen48l@gmail.com');
    console.log('\n🎉 BREVO FONCTIONNE PARFAITEMENT !');
    
    console.log('\n📊 Statistiques Brevo :');
    console.log('🌐 Interface : https://app.brevo.com');
    console.log('📈 Suivi des emails : Statistiques > Emails transactionnels');
    console.log('🆓 Quota restant : Visible dans votre dashboard');
    
    console.log('\n💡 Prochaines étapes :');
    console.log('1. Intégrer cette configuration dans votre app Zengest');
    console.log('2. Tester les notifications de réservation');
    console.log('3. Configurer les templates d\'emails');
    
  } catch (error) {
    console.error('❌ Erreur Brevo:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔑 Vérifications Brevo :');
      console.log('1. Email d\'inscription correct dans EMAIL_USER');
      console.log('2. Clé SMTP correcte dans EMAIL_PASSWORD');
      console.log('3. Clé SMTP active (pas expirée)');
      console.log('4. Compte Brevo confirmé');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Vérifiez :');
      console.log('1. Connexion internet');
      console.log('2. SMTP_HOST=smtp-relay.brevo.com');
    } else {
      console.log('\n💡 Guide de dépannage :');
      console.log('1. Vérifiez vos paramètres .env');
      console.log('2. Consultez la documentation Brevo');
      console.log('3. Vérifiez le quota email restant');
    }
  }
};

testBrevo();