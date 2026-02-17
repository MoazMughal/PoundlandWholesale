# Webhooks Quick Start

## 🚀 Quick Setup

### 1. Environment Variables (Optional)

Add to your `.env` file:

```bash
# Optional - for signature verification
GITHUB_WEBHOOK_SECRET=your-secret-here
CLOUDINARY_WEBHOOK_SECRET=your-secret-here
INTERNAL_WEBHOOK_TOKEN=your-token-here
```

**Note**: Webhooks work without these, but won't verify signatures.

### 2. Test Webhooks

```bash
# Start your server
npm start

# In another terminal, run tests
node test-webhooks.js
```

### 3. Check Logs

```bash
# View all webhook logs
tail -f logs/combined.log | grep WEBHOOK

# View only errors
tail -f logs/error.log | grep WEBHOOK
```

## 📡 Available Endpoints

| Endpoint | Purpose | External/Internal |
|----------|---------|-------------------|
| `POST /api/webhook/github` | GitHub deployment events | External |
| `POST /api/webhook/cloudinary` | Cloudinary upload tracking | External |
| `POST /api/webhook/user-registration` | User registration logging | Internal |
| `POST /api/webhook/generic/:source` | Custom events | Both |
| `GET /api/webhook/health` | Health check | Both |

## 🔧 Integration Points

Webhooks are automatically triggered at:

1. **User Registration** → Logs new buyer/seller signups
2. **Cloudinary Upload** → Logs successful image uploads

No code changes needed - they're already integrated!

## 🛡️ Safety Features

✅ Non-blocking (uses `setImmediate`)  
✅ Silent failures (won't break app)  
✅ Rate limiting (10 req/sec per IP)  
✅ Signature verification (when configured)  
✅ Comprehensive logging  

## 📝 Example: Manual Webhook Trigger

```javascript
import WebhookLogger from './services/webhookLogger.js';

// Log custom event
await WebhookLogger.logGeneric('my-source', 'my-event', {
  userId: '123',
  action: 'custom_action'
});
```

## 🔍 Debugging

```bash
# Check webhook health
curl http://localhost:5000/api/webhook/health

# Test GitHub webhook
curl -X POST http://localhost:5000/api/webhook/github \
  -H "Content-Type: application/json" \
  -H "x-github-event: push" \
  -d '{"ref":"refs/heads/main","repository":{"name":"test"}}'

# View logs
cat logs/combined.log | grep WEBHOOK
```

## 📚 Full Documentation

See [WEBHOOKS.md](../WEBHOOKS.md) for complete documentation.

## ⚠️ Important Notes

- Webhooks are **optional** - app works without them
- Webhook failures **never** affect core functionality
- All operations are **async** and **non-blocking**
- Designed for **logging and monitoring** only
- **Zero impact** on existing flows (orders, products, admin)
