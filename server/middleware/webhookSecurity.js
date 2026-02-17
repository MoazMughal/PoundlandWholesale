import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Webhook security middleware
 * Validates webhook signatures to prevent unauthorized access
 */

/**
 * Verify GitHub webhook signature
 */
const verifyGithubSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Skip verification if no secret is configured (development mode)
    if (!secret) {
      logger.warn('[WEBHOOK:SECURITY] GitHub webhook secret not configured');
      return next();
    }

    if (!signature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
      logger.error('[WEBHOOK:SECURITY] Invalid GitHub signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error('[WEBHOOK:SECURITY] GitHub verification error', { error: error.message });
    next(); // Continue anyway to prevent blocking
  }
};

/**
 * Verify Cloudinary webhook signature
 */
const verifyCloudinarySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-cld-signature'];
    const timestamp = req.headers['x-cld-timestamp'];
    const secret = process.env.CLOUDINARY_WEBHOOK_SECRET;

    // Skip verification if no secret is configured
    if (!secret) {
      logger.warn('[WEBHOOK:SECURITY] Cloudinary webhook secret not configured');
      return next();
    }

    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing signature or timestamp' });
    }

    // Verify timestamp is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      logger.error('[WEBHOOK:SECURITY] Cloudinary timestamp too old');
      return res.status(401).json({ error: 'Timestamp too old' });
    }

    const payload = JSON.stringify(req.body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error('[WEBHOOK:SECURITY] Invalid Cloudinary signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error('[WEBHOOK:SECURITY] Cloudinary verification error', { error: error.message });
    next(); // Continue anyway to prevent blocking
  }
};

/**
 * Rate limiting for webhooks
 */
const webhookRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting
  // In production, use Redis or similar
  const ip = req.ip;
  const key = `webhook_${ip}`;
  
  if (!global.webhookRateLimits) {
    global.webhookRateLimits = new Map();
  }

  const now = Date.now();
  const limit = global.webhookRateLimits.get(key);

  if (limit && now - limit.timestamp < 1000) {
    limit.count++;
    if (limit.count > 10) {
      logger.warn('[WEBHOOK:SECURITY] Rate limit exceeded', { ip });
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
  } else {
    global.webhookRateLimits.set(key, { timestamp: now, count: 1 });
  }

  // Cleanup old entries
  if (global.webhookRateLimits.size > 1000) {
    const oldKeys = Array.from(global.webhookRateLimits.keys()).slice(0, 500);
    oldKeys.forEach(k => global.webhookRateLimits.delete(k));
  }

  next();
};

/**
 * Internal webhook authentication
 * For webhooks called from within the application
 */
const verifyInternalWebhook = (req, res, next) => {
  const internalToken = req.headers['x-internal-token'];
  const expectedToken = process.env.INTERNAL_WEBHOOK_TOKEN || 'internal-webhook-token';

  if (internalToken !== expectedToken) {
    logger.warn('[WEBHOOK:SECURITY] Invalid internal webhook token');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

export {
  verifyGithubSignature,
  verifyCloudinarySignature,
  webhookRateLimit,
  verifyInternalWebhook
};
