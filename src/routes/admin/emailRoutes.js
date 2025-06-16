const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');

// Import sécurisé du service email
let emailService = null;
try {
  emailService = require('../../services/emailService');
} catch (error) {
  console.error('❌ EmailService non disponible dans routes admin');
}

// Middleware d'authentification pour toutes les routes
router.use(auth);

// Middleware de vérification permissions admin
router.use((req, res, next) => {
  if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Permissions administrateur requises'
    });
  }
  next();
});

/**
 * Test de configuration Brevo
 * POST /api/admin/email/test-configuration
 */
router.post('/test-configuration', async (req, res) => {
  try {
    if (!emailService) {
      return res.status(503).json({
        success: false,
        message: 'Service email non disponible'
      });
    }

    const result = await emailService.testConfiguration();
    
    res.json({
      success: true,
      message: 'Test de configuration réussi',
      data: result
    });
  } catch (error) {
    console.error('❌ Erreur test configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test de configuration',
      error: error.message
    });
  }
});

/**
 * Test envoi email simple
 * POST /api/admin/email/test-send
 */
router.post('/test-send', async (req, res) => {
  try {
    if (!emailService) {
      return res.status(503).json({
        success: false,
        message: 'Service email non disponible'
      });
    }

    const { email, name } = req.body;
    const testEmail = email || req.user.email || 'test@example.com';
    const testName = name || req.user.firstName || 'Test User';

    const result = await emailService.sendSimpleEmail({
      to: testEmail,
      toName: testName,
      subject: 'Test Brevo - Zengest Admin',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Test Email Brevo - Zengest</h2>
          <p>Bonjour ${testName},</p>
          <p>Cet email confirme que le service Brevo fonctionne correctement.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Détails du test :</strong></p>
            <ul>
              <li>Date : ${new Date().toLocaleString('fr-FR')}</li>
              <li>Utilisateur : ${req.user.email}</li>
              <li>Environnement : ${process.env.NODE_ENV}</li>
            </ul>
          </div>
          <p>Cordialement,<br>L'équipe Zengest</p>
        </div>
      `,
      textContent: `Test Brevo - Zengest - ${new Date().toLocaleString('fr-FR')}`
    });

    res.json({
      success: true,
      message: 'Email de test envoyé avec succès',
      data: {
        sentTo: testEmail,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('❌ Erreur test envoi:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du test',
      error: error.message
    });
  }
});

/**
 * Statistiques du service email
 * GET /api/admin/email/stats
 */
router.get('/stats', async (req, res) => {
  try {
    if (!emailService) {
      return res.status(503).json({
        success: false,
        message: 'Service email non disponible'
      });
    }

    const stats = emailService.getServiceStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erreur stats email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

/**
 * Statut des tâches cron
 * GET /api/admin/email/jobs-status
 */
router.get('/jobs-status', async (req, res) => {
  try {
    const emailJobs = require('../../jobs/emailJobs');
    const status = emailJobs.getJobsStatus();
    
    res.json({
      success: true,
      data: {
        jobs: status,
        environment: process.env.NODE_ENV,
        timezone: process.env.TZ || 'Europe/Paris'
      }
    });
  } catch (error) {
    console.error('❌ Erreur statut jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut des tâches',
      error: error.message
    });
  }
});

/**
 * Exécution manuelle d'une tâche
 * POST /api/admin/email/run-task
 */
router.post('/run-task', async (req, res) => {
  try {
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({
        success: false,
        message: 'Nom de tâche requis'
      });
    }

    const emailJobs = require('../../jobs/emailJobs');
    await emailJobs.runTaskManually(taskName);
    
    res.json({
      success: true,
      message: `Tâche ${taskName} exécutée avec succès`
    });
  } catch (error) {
    console.error('❌ Erreur exécution tâche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution de la tâche',
      error: error.message
    });
  }
});

module.exports = router;