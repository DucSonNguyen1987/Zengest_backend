const nodemailer = require('nodemailer');
const config = require('./config');

// Configuration du transporteur email
const createTransporter = () => {
  // Pour Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Utiliser un App Password
      }
    });
  }
  
  // Pour SMTP personnalisé
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransporter();

// Vérifier la configuration au démarrage
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Configuration email vérifiée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur configuration email:', error.message);
    return false;
  }
};

// Templates d'emails
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
  
  reservationReminder: {
    subject: 'Rappel - Votre réservation demain - {restaurantName}',
    text: `
Bonjour {customerName},

Nous vous rappelons votre réservation prévue demain :

- Date : {date}
- Heure : {time}
- Nombre de personnes : {guests}
- Table : {tableNumber}

À bientôt !
L'équipe {restaurantName}
    `,
    html: `
<h2>Rappel de réservation</h2>
<p>Bonjour <strong>{customerName}</strong>,</p>
<p>Nous vous rappelons votre réservation prévue <strong>demain</strong> :</p>

<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
  <p><strong>Date :</strong> {date}</p>
  <p><strong>Heure :</strong> {time}</p>
  <p><strong>Nombre de personnes :</strong> {guests}</p>
  <p><strong>Table :</strong> {tableNumber}</p>
</div>

<p>À bientôt !</p>
<p><em>L'équipe {restaurantName}</em></p>
    `
  },
  
  reservationCancellation: {
    subject: 'Annulation de votre réservation - {restaurantName}',
    text: `
Bonjour {customerName},

Votre réservation du {date} à {time} a été annulée.

Raison : {reason}

N'hésitez pas à nous contacter pour une nouvelle réservation.

L'équipe {restaurantName}
    `,
    html: `
<h2>Annulation de réservation</h2>
<p>Bonjour <strong>{customerName}</strong>,</p>
<p>Votre réservation du <strong>{date} à {time}</strong> a été annulée.</p>

{reasonBlock}

<p>N'hésitez pas à nous contacter pour une nouvelle réservation.</p>
<p><em>L'équipe {restaurantName}</em></p>
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

// Fonction principale pour envoyer un email
const sendEmail = async (to, templateKey, variables, attachments = null) => {
  try {
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
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to,
      subject: replaceTemplateVariables(template.subject, variables),
      text: replaceTemplateVariables(template.text, variables),
      html: replaceTemplateVariables(template.html, variables)
    };
    
    if (attachments) {
      mailOptions.attachments = attachments;
    }
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès à ${to}:`, result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error(`❌ Erreur envoi email à ${to}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
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
  enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  reminderHoursBefore: parseInt(process.env.REMINDER_HOURS_BEFORE) || 24,
  maxRetriesPerEmail: 3,
  retryDelayMs: 5000
};

module.exports = {
  transporter,
  verifyEmailConfig,
  sendEmail,
  sendReservationConfirmation,
  sendReservationReminder,
  sendReservationCancellation,
  emailTemplates,
  emailConfig
};