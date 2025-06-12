const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const logger = require('./logger');

// Configuration par défaut
const DEFAULT_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@zengest.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'contact@zengest.com'
};

/**
 * Créer le transporteur email selon la configuration
 */
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE?.toLowerCase();
  
  let transportConfig = {};

  switch (emailService) {
    case 'brevo':
      transportConfig = {
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
      break;

    case 'gmail':
      transportConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
      break;

    case 'outlook':
      transportConfig = {
        service: 'hotmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
      break;

    case 'smtp':
    default:
      transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };
      break;
  }

  return nodemailer.createTransporter(transportConfig);
};

// Instance du transporteur
let transporter = null;

/**
 * Initialiser le service email
 */
const initializeEmailService = async () => {
  try {
    transporter = createTransporter();
    
    // Vérifier la configuration
    await transporter.verify();
    logger.info('Service email initialisé avec succès');
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation du service email:', error);
    return false;
  }
};

/**
 * Templates HTML pour les emails
 */
const EMAIL_TEMPLATES = {
  // Template de base
  base: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{{subject}}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #e67e22; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #e67e22; }
        .content { margin-bottom: 30px; }
        .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 12px 24px; background: #e67e22; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #e67e22; margin: 15px 0; }
        .highlight { color: #e67e22; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🍽️ {{restaurantName}}</div>
        </div>
        <div class="content">
          {{{content}}}
        </div>
        <div class="footer">
          <p>{{restaurantName}} - Restaurant gastronomique</p>
          <p>{{restaurantAddress}}</p>
          <p>Tél: {{restaurantPhone}} | Email: {{restaurantEmail}}</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Confirmation de réservation
  'reservation-confirmation': `
    <h2>✅ Confirmation de votre réservation</h2>
    <p>Bonjour <strong>{{customerName}}</strong>,</p>
    <p>Nous avons le plaisir de confirmer votre réservation chez {{restaurantName}}.</p>
    
    <div class="info-box">
      <h3>📋 Détails de votre réservation</h3>
      <table>
        <tr><th>Date</th><td>{{date}}</td></tr>
        <tr><th>Heure</th><td>{{time}}</td></tr>
        <tr><th>Nombre de personnes</th><td>{{partySize}}</td></tr>
        <tr><th>Référence</th><td class="highlight">{{reservationId}}</td></tr>
      </table>
      {{#if specialRequests}}
      <p><strong>Demandes spéciales:</strong> {{specialRequests}}</p>
      {{/if}}
    </div>

    <p>Nous vous attendons avec impatience et vous préparons une expérience culinaire mémorable.</p>
    
    <div class="info-box">
      <h4>ℹ️ Informations importantes</h4>
      <ul>
        <li>Merci d'arriver à l'heure pour profiter pleinement de votre expérience</li>
        <li>En cas d'empêchement, contactez-nous au plus tôt</li>
        <li>Notre menu propose des options végétariennes et sans gluten</li>
      </ul>
    </div>

    <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
    <p>À très bientôt !</p>
    <p><em>L'équipe {{restaurantName}}</em></p>
  `,

  // Notification nouvelle réservation pour le restaurant
  'new-reservation-notification': `
    <h2>🔔 Nouvelle réservation</h2>
    <p>Une nouvelle réservation vient d'être effectuée sur le site web.</p>
    
    <div class="info-box">
      <h3>👤 Informations client</h3>
      <table>
        <tr><th>Nom</th><td>{{customerName}}</td></tr>
        <tr><th>Email</th><td>{{customerEmail}}</td></tr>
        <tr><th>Téléphone</th><td>{{customerPhone}}</td></tr>
      </table>
    </div>

    <div class="info-box">
      <h3>📅 Détails réservation</h3>
      <table>
        <tr><th>Date</th><td>{{date}}</td></tr>
        <tr><th>Heure</th><td>{{time}}</td></tr>
        <tr><th>Personnes</th><td>{{partySize}}</td></tr>
        <tr><th>Référence</th><td class="highlight">{{reservationId}}</td></tr>
      </table>
      {{#if specialRequests}}
      <p><strong>Demandes spéciales:</strong> {{specialRequests}}</p>
      {{/if}}
    </div>

    <a href="{{adminUrl}}/reservations/{{reservationId}}" class="btn">Gérer la réservation</a>
  `,

  // Message de contact
  'contact-message': `
    <h2>📧 Nouveau message de contact</h2>
    <p>Un nouveau message de contact a été reçu depuis le site web.</p>
    
    <div class="info-box">
      <h3>👤 Expéditeur</h3>
      <table>
        <tr><th>Nom</th><td>{{senderName}}</td></tr>
        <tr><th>Email</th><td>{{senderEmail}}</td></tr>
        {{#if senderPhone}}
        <tr><th>Téléphone</th><td>{{senderPhone}}</td></tr>
        {{/if}}
      </table>
    </div>

    {{#if messageSubject}}
    <div class="info-box">
      <h4>💬 Sujet: {{messageSubject}}</h4>
    </div>
    {{/if}}

    <div class="info-box">
      <h3>✉️ Message</h3>
      <p style="white-space: pre-wrap;">{{messageBody}}</p>
    </div>

    <p><em>Répondez directement à cet email pour contacter {{senderName}}.</em></p>
  `,

  // Accusé de réception du message de contact
  'contact-acknowledgment': `
    <h2>✅ Message bien reçu</h2>
    <p>Bonjour <strong>{{customerName}}</strong>,</p>
    <p>Nous avons bien reçu votre message et vous en remercions.</p>
    
    {{#if messageSubject}}
    <div class="info-box">
      <p><strong>Sujet:</strong> {{messageSubject}}</p>
    </div>
    {{/if}}

    <p>Notre équipe va examiner votre demande et vous répondra dans les plus brefs délais, généralement sous 24 heures.</p>
    
    <p>Pour toute urgence, vous pouvez nous contacter directement par téléphone.</p>
    
    <p>Cordialement,</p>
    <p><em>L'équipe {{restaurantName}}</em></p>
  `,

  // Rappel de réservation
  'reservation-reminder': `
    <h2>⏰ Rappel de votre réservation</h2>
    <p>Bonjour <strong>{{customerName}}</strong>,</p>
    <p>Nous vous rappelons votre réservation chez {{restaurantName}} <strong>{{timeUntil}}</strong>.</p>
    
    <div class="info-box">
      <h3>📋 Votre réservation</h3>
      <table>
        <tr><th>Date</th><td>{{date}}</td></tr>
        <tr><th>Heure</th><td>{{time}}</td></tr>
        <tr><th>Personnes</th><td>{{partySize}}</td></tr>
      </table>
    </div>

    <p>Nous nous réjouissons de vous accueillir !</p>
    
    <div class="info-box">
      <h4>📍 Comment nous trouver</h4>
      <p>{{restaurantAddress}}</p>
      {{#if parkingInfo}}
      <p><strong>Parking:</strong> {{parkingInfo}}</p>
      {{/if}}
    </div>

    <p>En cas d'empêchement de dernière minute, merci de nous prévenir au {{restaurantPhone}}.</p>
    <p>À très bientôt !</p>
  `,

  // Notification plat du jour approuvé
  'daily-special-approved': `
    <h2>✅ Votre plat du jour a été approuvé</h2>
    <p>Bonjour <strong>{{createdBy.firstName}}</strong>,</p>
    <p>Excellente nouvelle ! Votre plat du jour <strong>"{{special.name}}"</strong> vient d'être approuvé par {{approvedBy.firstName}} {{approvedBy.lastName}}.</p>
    
    <div class="info-box">
      <h3>🍽️ Détails du plat</h3>
      <table>
        <tr><th>Nom</th><td>{{special.name}}</td></tr>
        <tr><th>Prix</th><td>{{special.price}}€</td></tr>
        <tr><th>Catégorie</th><td>{{special.category}}</td></tr>
        <tr><th>Date de disponibilité</th><td>{{special.availableDate}}</td></tr>
      </table>
    </div>

    <p>Votre plat sera visible sur le site vitrine et disponible pour commande dès maintenant.</p>
    <p>Félicitations pour cette belle création !</p>
    
    <a href="{{adminUrl}}/daily-specials/{{special._id}}" class="btn">Voir le plat</a>
  `,

  // Notification plat du jour rejeté
  'daily-special-rejected': `
    <h2>❌ Votre plat du jour nécessite des modifications</h2>
    <p>Bonjour <strong>{{createdBy.firstName}}</strong>,</p>
    <p>Votre plat du jour <strong>"{{special.name}}"</strong> a été examiné par {{rejectedBy.firstName}} {{rejectedBy.lastName}} et nécessite quelques ajustements.</p>
    
    <div class="info-box">
      <h3>📝 Motif du rejet</h3>
      <p>{{rejectionReason}}</p>
    </div>

    <div class="info-box">
      <h3>🍽️ Votre plat</h3>
      <table>
        <tr><th>Nom</th><td>{{special.name}}</td></tr>
        <tr><th>Description</th><td>{{special.description}}</td></tr>
        <tr><th>Prix</th><td>{{special.price}}€</td></tr>
      </table>
    </div>

    <p>N'hésitez pas à modifier votre plat selon les commentaires et à le soumettre à nouveau.</p>
    <p>L'équipe est là pour vous aider à créer des plats exceptionnels !</p>
    
    <a href="{{adminUrl}}/daily-specials/{{special._id}}/edit" class="btn">Modifier le plat</a>
  `,

  // Email de test
  'test-email': `
    <h2>🧪 Email de test</h2>
    <p>Ceci est un email de test pour vérifier la configuration du service email.</p>
    
    <div class="info-box">
      <h3>ℹ️ Informations techniques</h3>
      <table>
        <tr><th>Service</th><td>{{emailService}}</td></tr>
        <tr><th>Heure d'envoi</th><td>{{timestamp}}</td></tr>
        <tr><th>Environnement</th><td>{{environment}}</td></tr>
      </table>
    </div>

    <p>Si vous recevez cet email, la configuration fonctionne correctement !</p>
  `
};

/**
 * Compiler un template avec des données
 */
const compileTemplate = (templateName, data) => {
  const baseTemplate = handlebars.compile(EMAIL_TEMPLATES.base);
  const contentTemplate = handlebars.compile(EMAIL_TEMPLATES[templateName] || EMAIL_TEMPLATES[templateName]);
  
  const content = contentTemplate(data);
  
  return baseTemplate({
    ...data,
    content,
    subject: data.subject || 'Message de Zengest'
  });
};

/**
 * Envoyer un email
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      const initialized = await initializeEmailService();
      if (!initialized) {
        throw new Error('Service email non disponible');
      }
    }

    const {
      to,
      subject,
      template,
      data = {},
      attachments = [],
      priority = 'normal'
    } = options;

    let html;
    let text;

    if (template) {
      // Utiliser un template
      html = compileTemplate(template, {
        ...data,
        subject,
        restaurantName: data.restaurantName || 'Zengest',
        restaurantAddress: data.restaurantAddress || process.env.RESTAURANT_ADDRESS,
        restaurantPhone: data.restaurantPhone || process.env.RESTAURANT_PHONE,
        restaurantEmail: data.restaurantEmail || process.env.RESTAURANT_EMAIL,
        adminUrl: process.env.WEB_ADMIN_URL || 'http://localhost:3002'
      });
      
      // Générer une version texte simple
      text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    } else {
      // Email simple
      html = options.html;
      text = options.text;
    }

    const mailOptions = {
      from: `"${data.restaurantName || 'Zengest'}" <${DEFAULT_CONFIG.from}>`,
      to,
      subject,
      html,
      text,
      replyTo: data.replyTo || DEFAULT_CONFIG.replyTo,
      attachments,
      priority: priority === 'high' ? 'high' : 'normal'
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email envoyé avec succès à ${to}: ${subject}`, {
      messageId: result.messageId,
      to,
      subject,
      template
    });

    return {
      success: true,
      messageId: result.messageId,
      info: result
    };

  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'email:', error, {
      to: options.to,
      subject: options.subject,
      template: options.template
    });

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Envoyer un email de test
 */
const sendTestEmail = async (to, restaurantData = {}) => {
  return await sendEmail({
    to,
    subject: 'Test - Configuration email Zengest',
    template: 'test-email',
    data: {
      ...restaurantData,
      emailService: process.env.EMAIL_SERVICE || 'SMTP',
      timestamp: new Date().toLocaleString('fr-FR'),
      environment: process.env.NODE_ENV || 'development'
    }
  });
};

/**
 * Envoyer un email de confirmation de réservation
 */
const sendReservationConfirmation = async (reservation, restaurantData = {}) => {
  return await sendEmail({
    to: reservation.customerEmail,
    subject: `Confirmation de réservation - ${restaurantData.name || 'Zengest'}`,
    template: 'reservation-confirmation',
    data: {
      ...restaurantData,
      customerName: reservation.customerName,
      date: new Date(reservation.date).toLocaleDateString('fr-FR'),
      time: reservation.time,
      partySize: reservation.partySize,
      specialRequests: reservation.specialRequests,
      reservationId: reservation._id
    }
  });
};

/**
 * Envoyer une notification de nouvelle réservation
 */
const sendNewReservationNotification = async (reservation, restaurantData = {}) => {
  return await sendEmail({
    to: restaurantData.email || process.env.RESTAURANT_EMAIL,
    subject: `Nouvelle réservation - ${restaurantData.name || 'Zengest'}`,
    template: 'new-reservation-notification',
    data: {
      ...restaurantData,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerPhone: reservation.customerPhone,
      date: new Date(reservation.date).toLocaleDateString('fr-FR'),
      time: reservation.time,
      partySize: reservation.partySize,
      specialRequests: reservation.specialRequests,
      reservationId: reservation._id
    }
  });
};

/**
 * Envoyer un rappel de réservation
 */
const sendReservationReminder = async (reservation, restaurantData = {}, timeUntil = '') => {
  return await sendEmail({
    to: reservation.customerEmail,
    subject: `Rappel - Votre réservation chez ${restaurantData.name || 'Zengest'}`,
    template: 'reservation-reminder',
    data: {
      ...restaurantData,
      customerName: reservation.customerName,
      date: new Date(reservation.date).toLocaleDateString('fr-FR'),
      time: reservation.time,
      partySize: reservation.partySize,
      timeUntil,
      parkingInfo: restaurantData.parkingInfo
    }
  });
};

/**
 * Envoyer un message de contact
 */
const sendContactMessage = async (contactData, restaurantData = {}) => {
  return await sendEmail({
    to: restaurantData.email || process.env.RESTAURANT_EMAIL,
    subject: `Message de contact - ${restaurantData.name || 'Zengest'}`,
    template: 'contact-message',
    data: {
      ...restaurantData,
      ...contactData
    },
    replyTo: contactData.senderEmail
  });
};

/**
 * Envoyer un accusé de réception de contact
 */
const sendContactAcknowledgment = async (contactData, restaurantData = {}) => {
  return await sendEmail({
    to: contactData.senderEmail,
    subject: `Message reçu - ${restaurantData.name || 'Zengest'}`,
    template: 'contact-acknowledgment',
    data: {
      ...restaurantData,
      customerName: contactData.senderName,
      messageSubject: contactData.messageSubject
    }
  });
};

/**
 * Vérifier le statut du service email
 */
const getEmailServiceStatus = async () => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }
    
    await transporter.verify();
    
    return {
      status: 'operational',
      service: process.env.EMAIL_SERVICE || 'SMTP',
      host: process.env.SMTP_HOST,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
};

// Initialiser le service au chargement du module
initializeEmailService();

module.exports = {
  sendEmail,
  sendTestEmail,
  sendReservationConfirmation,
  sendNewReservationNotification,
  sendReservationReminder,
  sendContactMessage,
  sendContactAcknowledgment,
  getEmailServiceStatus,
  initializeEmailService,
  EMAIL_TEMPLATES
};