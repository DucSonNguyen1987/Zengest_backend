/**
 * SERVICE EMAIL BREVO - VERSION COMPLÈTE
 * Gestion centralisée des emails avec Brevo pour Zengest
 * ✅ TOUTES LES MÉTHODES INTÉGRÉES
 */

const { Configuration, TransactionalEmailsApi } = require('@getbrevo/brevo');

class EmailService {
  constructor() {
    // Configuration Brevo
    this.configuration = new Configuration({
      apiKey: process.env.BREVO_API_KEY
    });
    this.apiInstance = new TransactionalEmailsApi(this.configuration);
    
    // Informations expéditeur
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@zengest.fr';
    this.senderName = process.env.BREVO_SENDER_NAME || 'Restaurant Zengest';
    
    // ✅ Templates IDs (avec template d'annulation)
    this.templates = {
      RESERVATION_CONFIRMATION: parseInt(process.env.BREVO_TEMPLATE_RESERVATION_CONFIRMATION) || null,
      RESERVATION_REMINDER: parseInt(process.env.BREVO_TEMPLATE_RESERVATION_REMINDER) || null,
      RESERVATION_CANCELLATION: parseInt(process.env.BREVO_TEMPLATE_RESERVATION_CANCELLATION) || null,
      DAILY_SPECIALS_NOTIFICATION: parseInt(process.env.BREVO_TEMPLATE_DAILY_SPECIALS_NOTIFICATION) || null,
      WELCOME: parseInt(process.env.BREVO_TEMPLATE_WELCOME) || null,
      CONTACT_FORM: parseInt(process.env.BREVO_TEMPLATE_CONTACT_FORM) || null
    };

    // Configuration restaurant
    this.restaurantInfo = {
      name: process.env.RESTAURANT_NAME || 'Restaurant Zengest',
      phone: process.env.RESTAURANT_PHONE || '+33 1 23 45 67 89',
      email: process.env.RESTAURANT_CONTACT_EMAIL || 'contact@zengest.fr',
      address: process.env.RESTAURANT_ADDRESS || '123 Rue de la Gastronomie, 75001 Paris',
      siteUrl: process.env.SITE_URL || 'https://zengest.fr'
    };

    console.log('📧 EmailService initialisé avec Brevo');
    console.log('📋 Templates configurés:', Object.keys(this.templates).filter(key => this.templates[key]));
  }

  // ===================================================================
  // MÉTHODES DE BASE BREVO
  // ===================================================================

  /**
   * Génère un ID de requête unique pour le tracking
   */
  generateRequestId() {
    return `zengest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Envoi d'email avec template Brevo
   * @param {Object} params - Paramètres de l'email
   * @param {string} params.to - Email destinataire
   * @param {string} params.toName - Nom destinataire
   * @param {number} params.templateId - ID du template Brevo
   * @param {Object} params.templateParams - Variables du template
   * @param {string} params.subject - Sujet (optionnel si défini dans le template)
   */
  async sendTemplateEmail({ to, toName, templateId, templateParams, subject }) {
    try {
      if (!templateId) {
        throw new Error('Template ID requis');
      }

      const requestId = this.generateRequestId();
      
      const emailData = {
        to: [{ email: to, name: toName || 'Client' }],
        templateId: templateId,
        params: templateParams || {},
        headers: {
          'X-Mailin-Custom': `{"request_id": "${requestId}"}`
        }
      };

      if (subject) {
        emailData.subject = subject;
      }

      console.log('📧 Envoi email template...', {
        to: to,
        templateId: templateId,
        requestId: requestId
      });

      const response = await this.apiInstance.sendTransacEmail(emailData);
      
      console.log('✅ Email template envoyé:', {
        messageId: response.messageId,
        to: to,
        templateId: templateId,
        requestId: requestId
      });

      return {
        success: true,
        messageId: response.messageId,
        requestId: requestId
      };
    } catch (error) {
      console.error('❌ Erreur envoi email template:', error);
      throw new Error(`Erreur lors de l'envoi de l'email template: ${error.message}`);
    }
  }

  /**
   * Envoi d'email simple (sans template)
   */
  async sendSimpleEmail({ to, toName, subject, htmlContent, textContent }) {
    try {
      const requestId = this.generateRequestId();
      
      const emailData = {
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to, name: toName || 'Client' }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        headers: {
          'X-Mailin-Custom': `{"request_id": "${requestId}"}`
        }
      };

      console.log('📧 Envoi email simple...', {
        to: to,
        subject: subject,
        requestId: requestId
      });

      const response = await this.apiInstance.sendTransacEmail(emailData);
      
      console.log('✅ Email simple envoyé:', {
        messageId: response.messageId,
        to: to,
        requestId: requestId
      });
      
      return {
        success: true,
        messageId: response.messageId,
        requestId: requestId
      };
    } catch (error) {
      console.error('❌ Erreur envoi email simple:', error);
      throw new Error(`Erreur lors de l'envoi de l'email simple: ${error.message}`);
    }
  }

  // ===================================================================
  // MÉTHODES SPÉCIFIQUES RÉSERVATIONS
  // ===================================================================

  /**
   * ✅ Confirmation de réservation
   */
  async sendReservationConfirmation(reservation, customerInfo) {
    try {
      const reservationDate = new Date(reservation.dateTime);
      
      const templateParams = {
        CUSTOMER_NAME: customerInfo.name || 'Cher client',
        RESERVATION_DATE: reservationDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        RESERVATION_TIME: reservationDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        GUESTS_COUNT: reservation.partySize,
        RESTAURANT_NAME: this.restaurantInfo.name,
        RESTAURANT_PHONE: this.restaurantInfo.phone,
        RESTAURANT_ADDRESS: this.restaurantInfo.address,
        RESTAURANT_EMAIL: this.restaurantInfo.email,
        RESERVATION_ID: reservation._id,
        SITE_URL: this.restaurantInfo.siteUrl,
        SPECIAL_REQUESTS: Array.isArray(reservation.specialRequests) 
          ? reservation.specialRequests.join(', ') 
          : (reservation.specialRequests || ''),
        DURATION: reservation.duration || 120
      };

      // Utiliser template si disponible, sinon email simple
      if (this.templates.RESERVATION_CONFIRMATION) {
        console.log('📧 Envoi confirmation avec template Brevo...');
        return await this.sendTemplateEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          templateId: this.templates.RESERVATION_CONFIRMATION,
          templateParams
        });
      } else {
        console.log('📧 Envoi confirmation email simple...');
        return await this.sendSimpleEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          subject: `✅ Confirmation de votre réservation - ${this.restaurantInfo.name}`,
          htmlContent: this.generateReservationConfirmationHTML(templateParams),
          textContent: this.generateReservationConfirmationText(templateParams)
        });
      }
    } catch (error) {
      console.error('❌ Erreur envoi confirmation réservation:', error);
      throw error;
    }
  }

  /**
   * ✅ Annulation de réservation (NOUVELLE MÉTHODE)
   */
  async sendReservationCancellation(reservation, customerInfo, reason = '') {
    try {
      const reservationDate = new Date(reservation.dateTime);
      
      const templateParams = {
        CUSTOMER_NAME: customerInfo.name || 'Cher client',
        RESERVATION_DATE: reservationDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        RESERVATION_TIME: reservationDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        GUESTS_COUNT: reservation.partySize,
        RESTAURANT_NAME: this.restaurantInfo.name,
        RESTAURANT_PHONE: this.restaurantInfo.phone,
        RESTAURANT_EMAIL: this.restaurantInfo.email,
        CANCELLATION_REASON: reason || 'Annulation demandée',
        RESERVATION_ID: reservation._id,
        SITE_URL: this.restaurantInfo.siteUrl
      };

      // Utiliser template si disponible, sinon email simple
      if (this.templates.RESERVATION_CANCELLATION) {
        console.log('📧 Envoi annulation avec template Brevo...');
        return await this.sendTemplateEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          templateId: this.templates.RESERVATION_CANCELLATION,
          templateParams
        });
      } else {
        console.log('📧 Envoi annulation email simple...');
        return await this.sendSimpleEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          subject: `❌ Annulation de votre réservation - ${this.restaurantInfo.name}`,
          htmlContent: this.generateReservationCancellationHTML(templateParams),
          textContent: this.generateReservationCancellationText(templateParams)
        });
      }
    } catch (error) {
      console.error('❌ Erreur envoi annulation réservation:', error);
      throw error;
    }
  }

  /**
   * Rappel de réservation (24h avant)
   */
  async sendReservationReminder(reservation, customerInfo) {
    try {
      const reservationDate = new Date(reservation.dateTime);
      
      const templateParams = {
        CUSTOMER_NAME: customerInfo.name || 'Cher client',
        RESERVATION_DATE: reservationDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        RESERVATION_TIME: reservationDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        GUESTS_COUNT: reservation.partySize,
        RESTAURANT_NAME: this.restaurantInfo.name,
        RESTAURANT_PHONE: this.restaurantInfo.phone,
        RESTAURANT_ADDRESS: this.restaurantInfo.address,
        RESERVATION_ID: reservation._id
      };

      if (this.templates.RESERVATION_REMINDER) {
        return await this.sendTemplateEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          templateId: this.templates.RESERVATION_REMINDER,
          templateParams
        });
      } else {
        return await this.sendSimpleEmail({
          to: customerInfo.email,
          toName: customerInfo.name,
          subject: `🔔 Rappel : Votre réservation demain - ${this.restaurantInfo.name}`,
          htmlContent: this.generateReservationReminderHTML(templateParams),
          textContent: this.generateReservationReminderText(templateParams)
        });
      }
    } catch (error) {
      console.error('❌ Erreur envoi rappel réservation:', error);
      throw error;
    }
  }

  // ===================================================================
  // MÉTHODES MARKETING ET NEWSLETTER
  // ===================================================================

  /**
   * Notification des plats du jour aux abonnés
   */
  async sendDailySpecialsNotification(subscribers, dailySpecials) {
    try {
      const today = new Date();
      
      const promises = subscribers.map(subscriber => {
        const templateParams = {
          CUSTOMER_NAME: subscriber.name || 'Cher client',
          TODAY_DATE: today.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          SPECIALS_COUNT: dailySpecials.length,
          SPECIAL_1_NAME: dailySpecials[0]?.name || '',
          SPECIAL_1_DESCRIPTION: dailySpecials[0]?.description || '',
          SPECIAL_1_PRICE: dailySpecials[0]?.price ? `${dailySpecials[0].price}€` : '',
          SPECIAL_2_NAME: dailySpecials[1]?.name || '',
          SPECIAL_2_DESCRIPTION: dailySpecials[1]?.description || '',
          SPECIAL_2_PRICE: dailySpecials[1]?.price ? `${dailySpecials[1].price}€` : '',
          SPECIAL_3_NAME: dailySpecials[2]?.name || '',
          SPECIAL_3_DESCRIPTION: dailySpecials[2]?.description || '',
          SPECIAL_3_PRICE: dailySpecials[2]?.price ? `${dailySpecials[2].price}€` : '',
          RESTAURANT_NAME: this.restaurantInfo.name,
          SITE_URL: this.restaurantInfo.siteUrl,
          UNSUBSCRIBE_URL: `${this.restaurantInfo.siteUrl}/unsubscribe?token=${subscriber.unsubscribeToken}`
        };

        if (this.templates.DAILY_SPECIALS_NOTIFICATION) {
          return this.sendTemplateEmail({
            to: subscriber.email,
            toName: subscriber.name,
            templateId: this.templates.DAILY_SPECIALS_NOTIFICATION,
            templateParams
          });
        } else {
          return this.sendSimpleEmail({
            to: subscriber.email,
            toName: subscriber.name,
            subject: `🍽️ Nos plats du jour - ${today.toLocaleDateString('fr-FR')}`,
            htmlContent: this.generateDailySpecialsHTML(templateParams, dailySpecials),
            textContent: this.generateDailySpecialsText(templateParams, dailySpecials)
          });
        }
      });

      const results = await Promise.allSettled(promises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      
      console.log('📧 Notifications plats du jour:', { success: successCount, errors: errorCount });
      
      return results;
    } catch (error) {
      console.error('❌ Erreur envoi notifications plats du jour:', error);
      throw error;
    }
  }

  /**
   * Email de bienvenue pour nouveaux abonnés newsletter
   */
  async sendWelcomeEmail(subscriberInfo) {
    try {
      const templateParams = {
        CUSTOMER_NAME: subscriberInfo.name || 'Cher client',
        RESTAURANT_NAME: this.restaurantInfo.name,
        SITE_URL: this.restaurantInfo.siteUrl,
        RESTAURANT_PHONE: this.restaurantInfo.phone,
        UNSUBSCRIBE_URL: `${this.restaurantInfo.siteUrl}/unsubscribe?token=${subscriberInfo.unsubscribeToken}`
      };

      if (this.templates.WELCOME) {
        return await this.sendTemplateEmail({
          to: subscriberInfo.email,
          toName: subscriberInfo.name,
          templateId: this.templates.WELCOME,
          templateParams
        });
      } else {
        return await this.sendSimpleEmail({
          to: subscriberInfo.email,
          toName: subscriberInfo.name,
          subject: `🎉 Bienvenue dans la famille ${this.restaurantInfo.name} !`,
          htmlContent: this.generateWelcomeHTML(templateParams),
          textContent: this.generateWelcomeText(templateParams)
        });
      }
    } catch (error) {
      console.error('❌ Erreur envoi email bienvenue:', error);
      throw error;
    }
  }

  /**
   * Notification de formulaire de contact
   */
  async sendContactFormNotification(contactData) {
    try {
      const templateParams = {
        CUSTOMER_NAME: contactData.name,
        CUSTOMER_EMAIL: contactData.email,
        CUSTOMER_PHONE: contactData.phone || 'Non renseigné',
        MESSAGE: contactData.message,
        SUBJECT: contactData.subject || 'Demande de contact',
        DATE: new Date().toLocaleDateString('fr-FR'),
        TIME: new Date().toLocaleTimeString('fr-FR'),
        RESTAURANT_NAME: this.restaurantInfo.name
      };

      // Envoyer à l'équipe du restaurant
      if (this.templates.CONTACT_FORM) {
        return await this.sendTemplateEmail({
          to: this.restaurantInfo.email,
          toName: `Équipe ${this.restaurantInfo.name}`,
          templateId: this.templates.CONTACT_FORM,
          templateParams
        });
      } else {
        return await this.sendSimpleEmail({
          to: this.restaurantInfo.email,
          toName: `Équipe ${this.restaurantInfo.name}`,
          subject: `📞 Nouveau message de contact - ${contactData.subject || 'Sans sujet'}`,
          htmlContent: this.generateContactFormHTML(templateParams),
          textContent: this.generateContactFormText(templateParams)
        });
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification contact:', error);
      throw error;
    }
  }

  // ===================================================================
  // MÉTHODES DE TEST ET CONFIGURATION
  // ===================================================================

  /**
   * Test de configuration Brevo
   */
  async testConfiguration() {
    try {
      const testEmail = {
        to: process.env.TEST_EMAIL || 'test@zengest.fr',
        toName: 'Test Zengest',
        subject: '✅ Test configuration Brevo - Zengest',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">✅ Configuration Brevo fonctionnelle</h2>
            <p>Cet email confirme que l'intégration Brevo fonctionne correctement dans Zengest.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p><strong>Environnement:</strong> ${process.env.NODE_ENV || 'development'}</p>
              <p><strong>Service:</strong> EmailService Brevo</p>
            </div>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px;">
              <p><strong>Templates configurés:</strong></p>
              <ul>
                ${Object.keys(this.templates).map(key => 
                  `<li>${key}: ${this.templates[key] ? '✅ Configuré' : '❌ Non configuré'}</li>`
                ).join('')}
              </ul>
            </div>
            <hr style="margin: 30px 0;">
            <p style="color: #6c757d; font-size: 12px;">
              Test automatique depuis ${this.restaurantInfo.name}
            </p>
          </div>
        `,
        textContent: `
Test configuration Brevo - Zengest

Configuration fonctionnelle !
Date: ${new Date().toLocaleString('fr-FR')}
Environnement: ${process.env.NODE_ENV || 'development'}

Templates: ${Object.keys(this.templates).map(key => 
  `${key}: ${this.templates[key] ? 'OK' : 'NON'}`
).join(', ')}
        `
      };

      const result = await this.sendSimpleEmail(testEmail);
      console.log('✅ Test Brevo réussi:', result);
      return result;
    } catch (error) {
      console.error('❌ Test Brevo échoué:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques du service
   */
  getServiceStats() {
    return {
      service: 'Brevo TransactionalEmailsApi',
      sender: {
        email: this.senderEmail,
        name: this.senderName
      },
      templates: this.templates,
      restaurantInfo: this.restaurantInfo,
      configuredTemplates: Object.keys(this.templates).filter(key => this.templates[key]).length,
      totalTemplates: Object.keys(this.templates).length
    };
  }

  // ===================================================================
  // GÉNÉRATEURS HTML POUR LES EMAILS SIMPLES
  // ===================================================================

  /**
   * Génère le HTML pour la confirmation de réservation
   */
  generateReservationConfirmationHTML(params) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .reservation-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 5px; }
          .highlight { color: #2c3e50; font-weight: bold; }
          .emoji { font-size: 1.2em; }
          .btn { background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ ${params.RESTAURANT_NAME}</h1>
            <p>Votre réservation est confirmée !</p>
          </div>
          
          <div class="content">
            <p>Bonjour <strong>${params.CUSTOMER_NAME}</strong>,</p>
            
            <p>Nous avons le plaisir de confirmer votre réservation dans notre restaurant. Voici les détails :</p>
            
            <div class="reservation-details">
              <h3>📋 Détails de votre réservation</h3>
              <p><span class="emoji">📅</span> <strong>Date :</strong> <span class="highlight">${params.RESERVATION_DATE}</span></p>
              <p><span class="emoji">🕐</span> <strong>Heure :</strong> <span class="highlight">${params.RESERVATION_TIME}</span></p>
              <p><span class="emoji">👥</span> <strong>Nombre de personnes :</strong> <span class="highlight">${params.GUESTS_COUNT}</span></p>
              ${params.SPECIAL_REQUESTS ? `<p><span class="emoji">📝</span> <strong>Demandes spéciales :</strong> ${params.SPECIAL_REQUESTS}</p>` : ''}
              <p><span class="emoji">🆔</span> <strong>Numéro de réservation :</strong> <code>${params.RESERVATION_ID}</code></p>
            </div>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>✨ Nous avons hâte de vous accueillir !</strong></p>
              <p>Notre équipe prépare déjà votre expérience gastronomique exceptionnelle.</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>⚠️ Important :</strong></p>
              <ul>
                <li>Merci d'arriver 10 minutes avant l'heure de votre réservation</li>
                <li>En cas de retard de plus de 15 minutes, votre table pourrait être libérée</li>
                <li>Pour toute modification ou annulation, contactez-nous au moins 24h à l'avance</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.SITE_URL}" class="btn">🌐 Voir notre carte</a>
              <a href="tel:${params.RESTAURANT_PHONE}" class="btn">📞 Nous appeler</a>
            </div>
          </div>
          
          <div class="footer">
            <h3>🏪 ${params.RESTAURANT_NAME}</h3>
            <p>📍 ${params.RESTAURANT_ADDRESS}</p>
            <p>📞 ${params.RESTAURANT_PHONE}</p>
            <p>✉️ ${params.RESTAURANT_EMAIL}</p>
            
            <hr style="margin: 20px 0;">
            <p><small>Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Génère le HTML pour l'annulation de réservation
   */
  generateReservationCancellationHTML(params) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .reservation-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #ecf0f1; border-radius: 5px; }
          .highlight { color: #2c3e50; font-weight: bold; }
          .emoji { font-size: 1.2em; }
          .reason-box { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .btn { background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍽️ ${params.RESTAURANT_NAME}</h1>
            <p>Annulation de votre réservation</p>
          </div>
          
          <div class="content">
            <p>Bonjour <strong>${params.CUSTOMER_NAME}</strong>,</p>
            
            <p>Nous vous confirmons l'annulation de votre réservation dans notre restaurant.</p>
            
            <div class="reservation-details">
              <h3>📋 Détails de la réservation annulée</h3>
              <p><span class="emoji">📅</span> <strong>Date :</strong> <span class="highlight">${params.RESERVATION_DATE}</span></p>
              <p><span class="emoji">🕐</span> <strong>Heure :</strong> <span class="highlight">${params.RESERVATION_TIME}</span></p>
              <p><span class="emoji">👥</span> <strong>Nombre de personnes :</strong> <span class="highlight">${params.GUESTS_COUNT}</span></p>
              <p><span class="emoji">🆔</span> <strong>Numéro de réservation :</strong> <code>${params.RESERVATION_ID}</code></p>
            </div>
            
            ${params.CANCELLATION_REASON ? `
              <div class="reason-box">
                <p><strong>📝 Raison de l'annulation :</strong></p>
                <p>${params.CANCELLATION_REASON}</p>
              </div>
            ` : ''}
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>💚 Nous espérons vous accueillir bientôt !</strong></p>
              <p>N'hésitez pas à faire une nouvelle réservation quand vous le souhaitez. Notre équipe sera ravie de vous recevoir.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.SITE_URL}" class="btn">🌐 Faire une nouvelle réservation</a>
              <a href="tel:${params.RESTAURANT_PHONE}" class="btn">📞 Nous contacter</a>
            </div>
          </div>
          
          <div class="footer">
            <h3>🏪 ${params.RESTAURANT_NAME}</h3>
            <p>📞 ${params.RESTAURANT_PHONE}</p>
            <p>✉️ ${params.RESTAURANT_EMAIL}</p>
            
            <hr style="margin: 20px 0;">
            <p><small>Cet email a été envoyé automatiquement suite à l'annulation de votre réservation.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Génère le texte pour la confirmation de réservation
   */
  generateReservationConfirmationText(params) {
    return `
${params.RESTAURANT_NAME}
Confirmation de votre réservation

Bonjour ${params.CUSTOMER_NAME},

Nous confirmons votre réservation :

• Date : ${params.RESERVATION_DATE}
• Heure : ${params.RESERVATION_TIME}
• Personnes : ${params.GUESTS_COUNT}
${params.SPECIAL_REQUESTS ? `• Demandes spéciales : ${params.SPECIAL_REQUESTS}` : ''}
• Numéro : ${params.RESERVATION_ID}

Important :
- Arrivez 10 minutes avant l'heure
- Contactez-nous 24h à l'avance pour toute modification

Coordonnées :
${params.RESTAURANT_ADDRESS}
${params.RESTAURANT_PHONE}
${params.RESTAURANT_EMAIL}

À bientôt !
L'équipe ${params.RESTAURANT_NAME}
    `;
  }

  /**
   * Génère le texte pour l'annulation de réservation
   */
  generateReservationCancellationText(params) {
    return `
${params.RESTAURANT_NAME}
Annulation de votre réservation

Bonjour ${params.CUSTOMER_NAME},

Nous confirmons l'annulation de votre réservation :

• Date : ${params.RESERVATION_DATE}
• Heure : ${params.RESERVATION_TIME}
• Personnes : ${params.GUESTS_COUNT}
• Numéro : ${params.RESERVATION_ID}
${params.CANCELLATION_REASON ? `• Raison : ${params.CANCELLATION_REASON}` : ''}

Nous espérons vous accueillir prochainement.
N'hésitez pas à faire une nouvelle réservation sur ${params.SITE_URL}

Cordialement,
L'équipe ${params.RESTAURANT_NAME}
${params.RESTAURANT_PHONE}
${params.RESTAURANT_EMAIL}
    `;
  }

  // Générateurs pour les autres types d'emails (rappels, plats du jour, etc.)
  generateReservationReminderHTML(params) {
    return `<!-- HTML simplifié pour rappel -->`;
  }

  generateReservationReminderText(params) {
    return `Rappel: Votre réservation demain à ${params.RESERVATION_TIME}`;
  }

  generateDailySpecialsHTML(params, specials) {
    return `<!-- HTML pour plats du jour -->`;
  }

  generateDailySpecialsText(params, specials) {
    return `Plats du jour: ${specials.map(s => s.name).join(', ')}`;
  }

  generateWelcomeHTML(params) {
    return `<!-- HTML pour email de bienvenue -->`;
  }

  generateWelcomeText(params) {
    return `Bienvenue chez ${params.RESTAURANT_NAME} !`;
  }

  generateContactFormHTML(params) {
    return `<!-- HTML pour notification contact -->`;
  }

  generateContactFormText(params) {
    return `Nouveau message de ${params.CUSTOMER_NAME}: ${params.MESSAGE}`;
  }
}

// Export de l'instance unique
module.exports = new EmailService();