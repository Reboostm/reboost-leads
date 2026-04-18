# ReBoost Leads - Lead Generation & Outreach Automation

A comprehensive lead generation and outreach automation platform that scrapes leads from multiple sources, enriches them with contact information, and integrates with GoHighLevel for automated campaigns.

## Features

### 🔍 Lead Scraping
- **Google Maps Integration:** Search and discover businesses by location (state, county, city) and niche/category
- **Multi-source Aggregation:** Combines data from multiple sources (Google Maps, Hunter.io, public directories)
- **Smart Deduplication:** Fingerprint-based duplicate detection prevents duplicate leads

### 📊 Lead Enrichment
- **Email Finding:** Hunter.io integration to find business emails from websites
- **Contact Information:** Captures phone, email, website, social media handles
- **Location Hierarchy:** Full geographic data (street, city, county, state, ZIP)
- **Business Intelligence:** Reviews, ratings, review counts for lead scoring

### 🤖 Automation
- **Daily Scheduled Scraping:** Runs automatically at configurable times
- **Quota Management:** Smart API quota handling with account rotation support
- **Batch Processing:** Efficient processing of large lead sets
- **Search Configuration:** Create and manage automated searches by niche + location

### 📈 Lead Management
- **Comprehensive Database:** Firestore-backed lead storage with full-text search
- **Advanced Filtering:** Filter by niche, location, status, and custom criteria
- **Lead Tracking:** Monitor lead status from "new" to "contacted" to "converted"
- **Metrics Dashboard:** Daily metrics showing new leads, duplicates, and trends

### 🔗 GoHighLevel Integration
- **Campaign Mapping:** Push filtered leads to specific GHL workflows
- **Custom Messaging:** Segment leads for different outreach messages

## Quick Start

### 1. Set Up API Keys
Visit `/dashboard/api-setup` and add:
- **Google Maps API Key** - Get from [Google Cloud Console](https://console.cloud.google.com/)
- **Hunter.io API Key** - Get from [Hunter.io Account Settings](https://app.hunter.io/account/settings)

See [API_SETUP_GUIDE.md](./API_SETUP_GUIDE.md) for detailed instructions.

### 2. Create Your First Search
1. Go to `/dashboard/leads`
2. Click "New Search"
3. Enter: Niche (e.g., "Landscaping") + State (e.g., "Utah")
4. Click "Create Search"

### 3. Run a Search
- Click "Run Now" on your search
- System will:
  - Search Google Maps for businesses
  - Find emails via Hunter.io
  - Deduplicate against existing leads
  - Add new leads to your database

### 4. View Your Leads
- Leads appear in the "Leads Database" table
- Filter by niche, state, or status
- Click "View" for detailed information
- Copy contact info for outreach

## Data Structure

### Lead Fields Captured
```
Business Information
├── Name, Description, Website, Logo
├── Year Founded, Employee Count
│
Contact Info (For Outreach)
├── Primary Email, Secondary Emails
├── Primary Phone, Mobile, Alternative Phone
├── LinkedIn, Facebook, Instagram, Twitter
│
Location (Full Hierarchy)
├── Street Address, City, County
├── State, ZIP Code
├── Latitude, Longitude (for mapping)
│
Industry & Classification
├── Primary Niche (e.g., "Landscaping")
├── Secondary Categories
├── Custom Niche (user-defined)
│
Reputation & Reviews
├── Google Rating, Review Count
├── Yelp Rating, Yelp Review Count
├── BBB Rating
│
System Metadata
├── Date Found, Last Updated
├── Sources (where it came from)
├── Status (active, contacted, archived)
├── GHL Workflow/Campaign IDs
```

## How It Works

### Daily Automated Scraping

1. **Scheduled Trigger** (12:05 AM daily via cron)
   - Calls your API with secret token
   - Ensures API quota resets are respected

2. **Process Each Active Search**
   - "Landscaping in Utah"
   - "Plumbing in Texas"
   - Etc.

3. **Google Maps Search**
   - Finds 50-100+ matching businesses
   - Captures: name, phone, address, website, reviews

4. **Deduplication Check**
   - Generates fingerprint: name + city + state + phone
   - Compares against all existing leads
   - Skips if already in database

5. **Email Enrichment**
   - Extracts domain from website
   - Uses Hunter.io to find business emails
   - Adds primary + secondary emails

6. **Database Storage**
   - Stores complete lead record in Firestore
   - Logs metrics: found, new, duplicates, failures

7. **Dashboard Update**
   - Shows: "28 new landscaping leads today | Total: 847"

## Example Daily Workflow

**Monday Morning Email:**
```
Daily Lead Scrape Report - April 18, 2026

Active Searches: 3
├── Landscaping Utah - 32 new leads (total: 247)
├── Plumbing Utah - 21 new leads (total: 189)
└── HVAC Texas - 18 new leads (total: 156)

Summary:
├── Total Leads Found: 71
├── New Leads Added: 71
├── Duplicates Skipped: 12
└── Emails Enriched: 59/71 (83%)

API Usage:
├── Google Maps: 71/25,000
├── Hunter.io: 59/100 (monthly)
```

## Quota Management

### Daily Limits
| Service | Free Tier | Notes |
|---------|-----------|-------|
| Google Maps | 25,000/day | Plenty for most use cases |
| Hunter.io | 100/month (~3/day) | Create multiple accounts to scale |

### Smart Usage Strategy
- **Spread searches** across the week
- **Rotate niches** Monday-Friday
- **Create multiple Hunter.io accounts** to bypass monthly limits:
  - 1 account = 100/month
  - 3 accounts = 300/month
  - 5 accounts = 500/month

### Example Weekly Schedule
```
Monday:   Landscaping (nationwide) - 25 calls
Tuesday:  Plumbing (nationwide) - 25 calls
Wednesday: HVAC (nationwide) - 25 calls
Thursday:  Roofing (nationwide) - 25 calls
Friday:    Pressure Washing (nationwide) - 25 calls
```

## Integration with GoHighLevel

### Workflow
1. **Scrape & Store:** System finds leads and stores in database
2. **Filter & Segment:** You filter leads by location, niche, website presence
3. **Push to GHL:** Select leads and push to specific GHL workflow
4. **Campaign Runs:** GHL sends emails/calls based on lead segment
5. **Track Results:** Monitor open rates, responses, conversions

### How to Push Leads to GHL
(Coming in Phase 2)
1. Filter leads you want to push
2. Click "Push to GoHighLevel"
3. Select workflow/campaign
4. System sends to GHL API
5. GHL immediately starts outreach

## Project Files

### Key Endpoints
- `POST /api/scrape/execute-search` - Run a search manually
- `GET /api/scrape/daily` - Daily scheduler (triggered by cron)
- `POST /api/searches/create` - Create new search
- `GET /api/searches/list` - Get all searches

### Database Collections (Firestore)
- `leads` - All scraped leads (fingerprint-deduplicated)
- `lead_searches` - Your configured searches
- `import_metrics` - Daily scraping metrics and logs

### Dashboard Pages
- `/dashboard` - Home
- `/dashboard/leads` - Lead management & search configuration
- `/dashboard/api-setup` - API key configuration

## Deployment

### Local Development
```bash
npm run dev
# Access at http://localhost:3000
# Login: password "reboost2024"
```

### Production (Vercel)
1. Connect GitHub repo
2. Add environment variables
3. Deploy
4. Set up cron job (EasyCron, AWS EventBridge, etc.)
   - URL: `https://your-domain.vercel.app/api/scrape/daily`
   - Header: `x-cron-secret: your_token`
   - Schedule: Daily 12:05 AM

## FAQ

### Q: Will this scrape competitors' data?
**A:** You're finding businesses from Google Maps, which is public data. Recommended use: target your ideal customer profile, not to harm competitors.

### Q: How many leads can I gather?
**A:** Depends on:
- Number of active searches (niche + location combos)
- Daily Google Maps quota (25,000 requests)
- Hunter.io quota for emails (100-500+ calls/month)

Example: "Landscaping Utah" might find 50-100 businesses, repeated daily = 1,500-3,000/month for that one search.

### Q: What about duplicates?
**A:** System automatically detects using fingerprinting:
- Same business name + city + state + phone = duplicate
- Even if found from different sources, only stored once
- Builds your database without bloat

### Q: Can I push leads to GHL automatically?
**A:** Not yet (Phase 2 feature). Currently:
1. Scrape & enrich leads
2. Filter in dashboard
3. Manual push to GHL
Phase 2 will add automated workflows.

### Q: How accurate is the email data?
**A:** Hunter.io reports 95%+ accuracy on found emails. Some businesses may not have publicly discoverable emails (especially sole proprietors).

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No leads found | Check API keys in `/dashboard/api-setup` |
| "Rate limit exceeded" | Wait for quota reset or use different account |
| Leads not appearing | Verify search is marked "Active" |
| Duplicate emails | System will deduplicate on next run |
| Can't log in | Password is `reboost2024` |

## What's Next?

**Phase 2 (In Progress):**
- GoHighLevel API integration
- Bulk push to campaigns
- Lead detail editing

**Phase 3:**
- Apollo.io & RocketReach integration
- Advanced filtering & exports
- Automated campaign workflows

See [API_SETUP_GUIDE.md](./API_SETUP_GUIDE.md) for detailed API configuration.
