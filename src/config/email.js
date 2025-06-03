const nodemailer = require('nodemailer');
const config = require('./config');

// Configuration du transporteur email avec gestion d'erreurs améliorée
const createTransporter = () => {
  console.log('📧 Configuration email en cours...');
  console.log('Service:', config.emailService);
  console.log('User:', config.emailUser);
  console.log('Password configuré:', !!config.emailPassword);
  
  // Pour Gmail
  if (config.emailService === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.emailUser,
        pass: config.emailPassword
      },
      debug: config.nodeEnv === 'development', // Logs détaillés en dev
      logger: config.nodeEnv === 'development' // Logs de connexion
    });
  }
  
  // Pour SMTP personnalisé
  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.gmail.com',
    port: config.smtpPort || 587,
    secure: config.smtpSecure === 'true',
    auth: {
      user: config.emailUser,
      pass: config.emailPassword
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: config.nodeEnv === 'development',
    logger: config.nodeEnv === 'development'
  });
};

let transporter = null;
let isEmailConfigured = false;

// Vérifier la configuration au démarrage avec diagnostics détaillés
const verifyEmailConfig = async () => {
  try {
    // Vérifications préliminaires
    if (!config.emailUser || !config.emailPassword) {
      console.error('❌ Variables EMAIL_USER et EMAIL_PASSWORD manquantes');
      return false;
    }
    
    console.log('🔍 Vérification de la configuration email...');
    console.log('📧 Email utilisateur:', config.emailUser);
    console.log('🔑 Password configuré:', config.emailPassword ? 'Oui' : 'Non');
    console.log('🏢 Service:', config.emailService);
    
    // Créer le transporteur
    transporter = createTransporter();
    
    // Test de connexion
    await transporter.verify();
    
    console.log('✅ Configuration email vérifiée avec succès');
    isEmailConfigured = true;
    return true;
    
  } catch (error) {
    console.error('❌ Erreur configuration email:', error.message);
    
    // Diagnostics d'erreur spécifiques
    if (error.message.includes('535')) {
      console.error('');
      console.error('🚨 ERREUR D\'AUTHENTIFICATION GMAIL:');
      console.error('1. Activez la validation en 2 étapes sur votre compte Gmail');
      console.error('2. Créez un "App Password" dans les paramètres Google');
      console.error('3. Utilisez cet App Password (16 caractères) dans EMAIL_PASSWORD');
      console.error('4. NE PAS utiliser votre mot de passe Gmail principal');
      console.error('');
      console.error('Guide: https://support.google.com/accounts/answer/185833');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🚨 Problème de connexion réseau - Vérifiez votre connexion internet');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('🚨 Connexion refusée - Vérifiez les paramètres SMTP');
    }
    
    isEmailConfigured = false;
    return false;
  }
};

// Fonction utilitaire pour vérifier si les emails sont configurés
const isEmailReady = () => {
  return isEmailConfigured && transporter;
};

// Templates d'emails (inchangés)
const emailTemplates = {
  reservationConfirmation: {
    subject: 'Confirmation de votre réservation - {restaurantName}',
    text: `
Bonjour {customerName},

Votre réservation a été confirmée !

Détails de la réservation :
- Restaurant : {restaurantName}
- Date : {date}
- Heure : {time}
- Nombre de personnes : {guests}
- Table : {tableNumber}
- Référence : {reservationNumber}

Nous vous attendons avec plaisir !

L'équipe {restaurantName}
    `,
    html: `
<h2>Confirmation de réservation</h2>
<p>Bonjour <strong>{customerName}</strong>,</p>
<p>Votre réservation a été confirmée !</p>

<div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3>Détails de la réservation</h3>
  <ul style="list-style: none; padding: 0;">
    <li><strong>Restaurant :</strong> {restaurantName}</li>
    <li><strong>Date :</strong> {date}</li>
    <li><strong>Heure :</strong> {time}</li>
    <li><strong>Nombre de personnes :</strong> {guests}</li>
    <li><strong>Table :</strong> {tableNumber}</li>
    <li><strong>Référence :</strong> {reservationNumber}</li>
  </ul>
</div>

<p>Nous vous attendons avec plaisir !</p>
<p><em>L'équipe {restaurantName}</em></p>
    `
  },
  
  // Email de test
  test: {
    subject: 'Test de configuration email - Zengest',
    text: 'Si vous recevez cet email, la configuration fonctionne correctement !',
    html: `
<h2>✅ Test de configuration email</h2>
<p>Si vous recevez cet email, la configuration Zengest fonctionne correctement !</p>
<p><em>Configuré le ${new Date().toLocaleString('fr-FR')}</em></p>
    `
  }
};

// Fonction pour remplacer les variables dans les templates
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
};

// Fonction principale pour envoyer un email avec retry
const sendEmail = async (to, templateKey, variables = {}, attachments = null, retryCount = 0) => {
  try {
    // Vérifier si l'email est configuré
    if (!isEmailReady()) {
      console.warn('⚠️ Email non configuré - tentative d\'envoi ignorée');
      return {
        success: false,
        error: 'Configuration email non disponible'
      };
    }
    
    const template = emailTemplates[templateKey];
    if (!template) {
      throw new Error(`Template email '${templateKey}' non trouvé`);
    }
    
    // Traitement spécial pour certains templates
    if (templateKey === 'reservationCancellation' && variables.reason) {
      variables.reasonBlock = `<p><strong>Raison :</strong> ${variables.reason}</p>`;
    } else {
      variables.reasonBlock = '';
    }
    
    const mailOptions = {
      from: {
        name: variables.restaurantName || 'Zengest',
        address: config.emailFrom || config.emailUser
      },
      to,
      subject: replaceTemplateVariables(template.subject, variables),
      text: replaceTemplateVariables(template.text, variables),
      html: replaceTemplateVariables(template.html, variables)
    };
    
    if (attachments) {
      mailOptions.attachments = attachments;
    }
    
    console.log(`📤 Envoi email à ${to} (template: ${templateKey})...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error(`❌ Erreur envoi email à ${to}:`, error.message);
    
    // Retry logic pour les erreurs temporaires
    if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('ECONNREFUSED'))) {
      console.log(`🔄 Nouvelle tentative d'envoi (${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5 secondes
      return sendEmail(to, templateKey, variables, attachments, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction de test d'email
const sendTestEmail = async (to) => {
  return await sendEmail(to, 'test', {
    timestamp: new Date().toLocaleString('fr-FR')
  });
};

// Fonctions spécifiques pour chaque type d'email
const sendReservationConfirmation = async (reservation, restaurant) => {
  const variables = {
    customerName: reservation.customer.name,
    restaurantName: restaurant.name,
    date: new Date(reservation.dateTime).toLocaleDateString('fr-FR'),
    time: new Date(reservation.dateTime).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    guests: reservation.numberOfGuests,
    tableNumber: reservation.tableInfo?.number || 'À définir',
    reservationNumber: reservation.reservationNumber
  };
  
  return await sendEmail(
    reservation.customer.email,
    'reservationConfirmation',
    variables
  );
};

// Configuration globale des emails
const emailConfig = {
  enabled: config.enableEmailNotifications,
  reminderHoursBefore: config.reminderHoursBefore || 24,
  maxRetriesPerEmail: 3,
  retryDelayMs: 5000
};

module.exports = {
  transporter: () => transporter, // Fonction pour accéder au transporter
  verifyEmailConfig,
  sendEmail,
  sendTestEmail,
  sendReservationConfirmation,
  isEmailReady,
  emailTemplates,
  emailConfig
};