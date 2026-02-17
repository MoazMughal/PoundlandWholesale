import logger from '../utils/logger.js';

/**
 * Centralized webhook logging service
 * Non-blocking, async-only operations
 */
class WebhookLogger {
  /**
   * Log webhook event asynchronously
   * @param {string} source - Webhook source (github, cloudinary, user, etc.)
   * @param {string} event - Event type
   * @param {object} data - Event data
   * @param {string} status - success/error/info
   */
  static async logEvent(source, event, data, status = 'info') {
    setImmediate(() => {
      try {
        const logEntry = {
          timestamp: new Date().toISOString(),
          source,
          event,
          status,
          data: this.sanitizeData(data)
        };

        if (status === 'error') {
          logger.error(`[WEBHOOK:${source}] ${event}`, logEntry);
        } else {
          logger.info(`[WEBHOOK:${source}] ${event}`, logEntry);
        }
      } catch (error) {
        // Silent fail - webhook logging should never break the app
        logger.error('[WEBHOOK] Logging failed', { error: error.message });
      }
    });
  }

  /**
   * Sanitize sensitive data before logging
   */
  static sanitizeData(data) {
    if (!data) return {};
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  /**
   * Log GitHub webhook event
   */
  static async logGithub(event, payload) {
    await this.logEvent('github', event, {
      repository: payload?.repository?.name,
      branch: payload?.ref,
      pusher: payload?.pusher?.name,
      commits: payload?.commits?.length || 0
    }, 'info');
  }

  /**
   * Log Cloudinary webhook event
   */
  static async logCloudinary(event, payload) {
    await this.logEvent('cloudinary', event, {
      publicId: payload?.public_id,
      format: payload?.format,
      resourceType: payload?.resource_type,
      bytes: payload?.bytes,
      url: payload?.secure_url
    }, payload?.error ? 'error' : 'info');
  }

  /**
   * Log user registration event
   */
  static async logUserRegistration(userType, userData) {
    await this.logEvent('user_registration', `${userType}_registered`, {
      userType,
      email: userData?.email,
      userId: userData?._id,
      timestamp: userData?.createdAt
    }, 'info');
  }

  /**
   * Log generic webhook event
   */
  static async logGeneric(source, event, data, status = 'info') {
    await this.logEvent(source, event, data, status);
  }
}

export default WebhookLogger;
