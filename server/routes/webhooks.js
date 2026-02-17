import express from 'express';
import WebhookLogger from '../services/webhookLogger.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Webhook middleware - ensures non-blocking execution
 */
const asyncWebhookHandler = (handler) => {
  return (req, res, next) => {
    // Immediately respond to webhook
    res.status(200).json({ received: true, timestamp: new Date().toISOString() });
    
    // Process webhook asynchronously without blocking
    setImmediate(async () => {
      try {
        await handler(req);
      } catch (error) {
        logger.error('[WEBHOOK] Handler error', { error: error.message });
      }
    });
  };
};

/**
 * GitHub Deployment Webhook
 * POST /api/webhook/github
 * Purpose: Log deployment events, optional auto-deploy trigger
 */
router.post('/github', asyncWebhookHandler(async (req) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  await WebhookLogger.logGithub(event, payload);

  // Optional: Add auto-deploy logic here in future
  if (event === 'push' && payload?.ref === 'refs/heads/main') {
    logger.info('[WEBHOOK:GITHUB] Main branch push detected - ready for auto-deploy');
    // Future: Trigger deployment script
  }
}));

/**
 * Cloudinary Upload Webhook
 * POST /api/webhook/cloudinary
 * Purpose: Track uploads, log errors, monitor file metadata
 */
router.post('/cloudinary', asyncWebhookHandler(async (req) => {
  const payload = req.body;
  const notificationType = payload?.notification_type;

  await WebhookLogger.logCloudinary(notificationType, payload);

  // Log specific events
  if (notificationType === 'upload') {
    logger.info('[WEBHOOK:CLOUDINARY] Upload success', {
      publicId: payload?.public_id,
      format: payload?.format,
      size: payload?.bytes
    });
  } else if (notificationType === 'delete') {
    logger.info('[WEBHOOK:CLOUDINARY] Resource deleted', {
      publicId: payload?.public_id
    });
  } else if (payload?.error) {
    logger.error('[WEBHOOK:CLOUDINARY] Upload error', {
      error: payload?.error,
      publicId: payload?.public_id
    });
  }
}));

/**
 * User Registration Webhook
 * POST /api/webhook/user-registration
 * Purpose: Log new user registrations for analytics/monitoring
 * Note: This is called internally, not exposed externally
 */
router.post('/user-registration', asyncWebhookHandler(async (req) => {
  const { userType, userData } = req.body;

  await WebhookLogger.logUserRegistration(userType, userData);

  // Future: Add email notification, analytics tracking, etc.
  logger.info('[WEBHOOK:USER] New registration logged', {
    userType,
    userId: userData?._id
  });
}));

/**
 * Generic webhook endpoint for future integrations
 * POST /api/webhook/generic/:source
 */
router.post('/generic/:source', asyncWebhookHandler(async (req) => {
  const source = req.params.source;
  const payload = req.body;

  await WebhookLogger.logGeneric(source, 'generic_event', payload);
}));

/**
 * Health check endpoint
 * GET /api/webhook/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

export default router;
