import express from 'express';
import { isCloudinaryConfigured } from '../services/cloudinary.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/cloudinary-test/config
 * Test Cloudinary configuration
 */
router.get('/config', authenticateAdmin, async (req, res) => {
  try {
    const isConfigured = isCloudinaryConfigured();
    
    const config = {
      isConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
    };

    if (isConfigured) {
      res.json({
        success: true,
        message: 'Cloudinary is properly configured',
        config
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Cloudinary configuration is incomplete',
        config,
        instructions: [
          '1. Sign up for a free Cloudinary account at https://cloudinary.com',
          '2. Get your Cloud Name, API Key, and API Secret from the dashboard',
          '3. Add them to your .env file:',
          '   CLOUDINARY_CLOUD_NAME=your-cloud-name',
          '   CLOUDINARY_API_KEY=your-api-key',
          '   CLOUDINARY_API_SECRET=your-api-secret',
          '4. Restart the server'
        ]
      });
    }
  } catch (error) {
    console.error('Cloudinary config test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Cloudinary configuration',
      error: error.message
    });
  }
});

export default router;