const nodemailer = require('nodemailer');
const config = require('./config');

// Configuration du transporteur email avec Brevo
const createTransporter = () => {
  console.log('📧 Configuration email avec Brevo...');
  console.log('Service:', config.emailService || 'smtp');
  console.log('Host:', config.smtpHost);
  console.log('User:', config.emailUser);
  console.log('Password configuré:', !!config.emailPassword);
  
  // Configuration Brevo SMTP
  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp-relay.brevo.com',
    port: config.smtpPort || 587,
    secure: config.smtpSecure === 'true', // false pour port 587, true pour 465
    auth: {
      user: config.emailUser,        // Votre email d'inscription Brevo
      pass: config.emailPassword     // Votre clé SMTP Brevo
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: config.nodeEnv === 'development', // Logs détaillés en dev
    logger: config.nodeEnv === 'development' // Logs de connexion
  });
};

let transporter = null;
let isEmailConfigured = false;

// Vérifier la configuration au démarrage
const verifyEmailConfig = async () => {
  try {
    // Vérifications préliminaires
    if (!config.emailUser || !config.emailPassword) {
      console.error('❌ Variables EMAIL_USER et EMAIL_PASSWORD manquantes');
      return false;
    }
    
    console.log('🔍 Vérification de la configuration Brevo...');
    console.log('📧 Email utilisateur:', config.emailUser);
    console.log('🔑 Clé SMTP configurée:', config.emailPassword ? 'Oui' : 'Non');
    console.log('🌐 Serveur SMTP:', config.smtpHost || 'smtp-relay.brevo.com');
    console.log('🔌 Port SMTP:', config.smtpPort || 587);
    
    // Créer le transporteur
    transporter = createTransporter();
    
    // Test de connexion
    await transporter.verify();
    
    console.log('✅ Configuration Brevo vérifiée avec succès');
    isEmailConfigured = true;
    return true;
    
  } catch (error) {
    console.error('❌ Erreur configuration Brevo:', error.message);
    
    // Diagnostics d'erreur spécifiques à Brevo
    if (error.message.includes('Invalid login')) {
      console.error('');
      console.error('🚨 ERREUR D\'AUTHENTIFICATION BREVO:');
      console.error('1. Vérifiez votre email d\'inscription Brevo dans EMAIL_USER');
      console.error('2. Vérifiez votre clé SMTP Brevo dans EMAIL_PASSWORD');
      console.error('3. Assurez-vous que la clé SMTP est active');
      console.error('4. Connectez-vous sur app.brevo.com pour vérifier');
      console.error('');
      console.error('Guide: https://help.brevo.com/hc/fr/articles/209467485');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🚨 Problème de connexion réseau - Vérifiez votre connexion internet');
    } else if (error.message.includes('timeout')) {
      console.error('🚨 Timeout - connexion lente vers Brevo');
    }
    
    isEmailConfigured = false;
    return false;
  }
};

// Fonction utilitaire pour vérifier si les emails sont configurés
const isEmailReady = () => {
  return isEmailConfigured && transporter;
};

// Templates d'emails optimisés pour Brevo
const emailTemplates = {
  reservationConfirmation: {
    subject: 'Confirmation de votre réservation - {restaurantName}',
    text: `
Bonjour {customerName},

Votre réservation a été confirmée avec succès !

📅 Détails de la réservation :
- Restaurant : {restaurantName}
- Date : {date}
- Heure : {time}
- Nombre de personnes : {guests}
- Table : {tableNumber}
- Référence : {reservationNumber}

Nous vous attendons avec plaisir !

Cordialement,
L'équipe {restaurantName}

---
Cet email a été envoyé via Zengest Restaurant Management System
    `,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #0066cc; color: white; padding: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">✅ Réservation confirmée</h1>
  </div>
  
  <div style="padding: 30px;">
    <p style="font-size: 18px; color: #333;">Bonjour <strong>{customerName}</strong>,</p>
    <p style="font-size: 16px; color: #666;">Votre réservation a été confirmée avec succès !</p>
    
    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0066cc;">
      <h3 style="margin-top: 0; color: #0066cc; font-size: 20px;">📅 Détails de la réservation</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Restaurant :</td><td style="padding: 8px 0; color: #666;">{restaurantName}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Date :</td><td style="padding: 8px 0; color: #666;">{date}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Heure :</td><td style="padding: 8px 0; color: #666;">{time}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Personnes :</td><td style="padding: 8px 0; color: #666;">{guests}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Table :</td><td style="padding: 8px 0; color: #666;">{tableNumber}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #333;">Référence :</td><td style="padding: 8px 0; color: #666; font-family: monospace; background: #e9ecef; padding: 4px 8px; border-radius: 4px;">{reservationNumber}</td></tr>
      </table>
    </div>
    
    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #28a745; font-weight: bold; text-align: center;">
        🍽️ Nous vous attendons avec plaisir !
      </p>
    </div>
    
    <p style="color: #666; margin-top: 30px;">
      Cordialement,<br>
      <strong>L'équipe {restaurantName}</strong>
    </p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
    <p style="margin: 0; font-size: 12px; color: #999;">
      Cet email a été envoyé via Zengest Restaurant Management System<br>
      Propulsé par Brevo (ex-Sendinblue)
    </p>
  </div>
</div>
    `
  },
  
  reservationReminder: {
    subject: 'Rappel - Votre réservation demain - {restaurantName}',
    text: `
Bonjour {customerName},

Nous vous rappelons votre réservation prévue demain :

📅 Détails :
- Date : {date}
- Heure : {time}
- Nombre de personnes : {guests}
- Table : {tableNumber}

À très bientôt !
L'équipe {restaurantName}
    `,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #ff9500; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">⏰ Rappel de réservation</h2>
  </div>
  <div style="padding: 20px;">
    <p>Bonjour <strong>{customerName}</strong>,</p>
    <p>Nous vous rappelons votre réservation prévue <strong>demain</strong> :</p>
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p><strong>Date :</strong> {date}</p>
      <p><strong>Heure :</strong> {time}</p>
      <p><strong>Personnes :</strong> {guests}</p>
      <p><strong>Table :</strong> {tableNumber}</p>
    </div>
    <p>À très bientôt !</p>
    <p><em>L'équipe {restaurantName}</em></p>
  </div>
</div>
    `
  },
  
  reservationCancellation: {
    subject: 'Annulation de votre réservation - {restaurantName}',
    text: `
Bonjour {customerName},

Votre réservation du {date} à {time} a été annulée.

{reason}

N'hésitez pas à nous contacter pour une nouvelle réservation.

L'équipe {restaurantName}
    `,
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">❌ Annulation de réservation</h2>
  </div>
  <div style="padding: 20px;">
    <p>Bonjour <strong>{customerName}</strong>,</p>
    <p>Votre réservation du <strong>{date} à {time}</strong> a été annulée.</p>
    {reasonBlock}
    <p>N'hésitez pas à nous contacter pour une nouvelle réservation.</p>
    <p><em>L'équipe {restaurantName}</em></p>
  </div>
</div>
    `
  },
  
  test: {
    subject: 'Test Zengest - Configuration Brevo réussie',
    text: 'Si vous recevez cet email, la configuration Brevo fonctionne parfaitement !',
    html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #0066cc;">✅ Test de configuration Brevo</h2>
  <p>Si vous recevez cet email, la configuration Zengest + Brevo fonctionne parfaitement !</p>
  <p><em>Configuré le ${new Date().toLocaleString('fr-FR')}</em></p>
</div>
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
      variables.reasonBlock = `<div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Raison :</strong> ${variables.reason}</div>`;
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
      html: replaceTemplateVariables(template.html, variables),
      // Headers spécifiques pour Brevo
      headers: {
        'X-Mailer': 'Zengest Restaurant Management System',
        'X-Priority': '3'
      }
    };
    
    if (attachments) {
      mailOptions.attachments = attachments;
    }
    
    console.log(`📤 Envoi email via Brevo à ${to} (template: ${templateKey})...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès via Brevo:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      service: 'brevo'
    };
    
  } catch (error) {
    console.error(`❌ Erreur envoi email Brevo à ${to}:`, error.message);
    
    // Retry logic pour les erreurs temporaires
    if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('ECONNREFUSED'))) {
      console.log(`🔄 Nouvelle tentative d'envoi (${retryCount + 1}/3)...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5 secondes
      return sendEmail(to, templateKey, variables, attachments, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message,
      service: 'brevo'
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

const sendReservationReminder = async (reservation, restaurant) => {
  const variables = {
    customerName: reservation.customer.name,
    restaurantName: restaurant.name,
    date: new Date(reservation.dateTime).toLocaleDateString('fr-FR'),
    time: new Date(reservation.dateTime).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    guests: reservation.numberOfGuests,
    tableNumber: reservation.tableInfo?.number || 'À définir'
  };
  
  return await sendEmail(
    reservation.customer.email,
    'reservationReminder',
    variables
  );
};

const sendReservationCancellation = async (reservation, restaurant, reason = '') => {
  const variables = {
    customerName: reservation.customer.name,
    restaurantName: restaurant.name,
    date: new Date(reservation.dateTime).toLocaleDateString('fr-FR'),
    time: new Date(reservation.dateTime).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    reason: reason
  };
  
  return await sendEmail(
    reservation.customer.email,
    'reservationCancellation',
    variables
  );
};

// Configuration globale des emails
const emailConfig = {
  enabled: config.enableEmailNotifications,
  reminderHoursBefore: config.reminderHoursBefore || 24,
  maxRetriesPerEmail: 3,
  retryDelayMs: 5000,
  service: 'brevo'
};

module.exports = {
  transporter: () => transporter, // Fonction pour accéder au transporter
  verifyEmailConfig,
  sendEmail,
  sendTestEmail,
  sendReservationConfirmation,
  sendReservationReminder,
  sendReservationCancellation,
  isEmailReady,
  emailTemplates,
  emailConfig
};