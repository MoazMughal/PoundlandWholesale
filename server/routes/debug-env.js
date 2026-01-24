import express from 'express';

const router = express.Router();

// Debug endpoint to check environment variables (admin only)
router.get('/env-check', (req, res) => {
  // Only show in development or for debugging
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  res.json({
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    FRONTEND_URL: process.env.FRONTEND_URL,
    EMAIL_HOST: process.env.EMAIL_HOST,
    timestamp: new Date().toISOString()
  });
});

export default router;