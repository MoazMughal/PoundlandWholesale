import mongoose from 'mongoose';

const siteVisitSchema = new mongoose.Schema({
  visitorType: { type: String, enum: ['buyer', 'seller', 'guest'], default: 'guest' },
  visitorId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  visitorName: { type: String, default: 'Guest' },
  visitorEmail:{ type: String, default: '' },
  page:        { type: String, default: '/' },
  userAgent:   { type: String, default: '' },
  ip:          { type: String, default: '' },
  visitedAt:   { type: Date, default: Date.now }
}, { timestamps: false });

siteVisitSchema.index({ visitedAt: -1 });
siteVisitSchema.index({ visitorType: 1 });
siteVisitSchema.index({ visitorId: 1 });

export default mongoose.model('SiteVisit', siteVisitSchema);
