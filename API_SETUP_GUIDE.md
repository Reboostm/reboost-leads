# ReBoost Leads - API Setup Guide

This guide walks you through setting up the APIs needed for the ReBoost Leads system to scrape and enrich lead data.

## Required APIs

### 1. Google Maps API (Primary Lead Source)
**Purpose:** Search for businesses by location and niche (Landscaping, Plumbing, HVAC, etc.)

#### Setup Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (if you don't have one):
   - Click "Select a Project" → "New Project"
   - Name: "ReBoost Leads"
   - Click "Create"
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Search for and enable **"Maps JavaScript API"**
   - Search for and enable **"Places API"**
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key
   - Click the key to edit it:
     - **Application restrictions:** Select "HTTP referrers (web sites)"
       - Add: `localhost:3000/*`
       - Add: `*.vercel.app/*`
     - **API restrictions:** Select "Restrict key"
       - Add: Maps JavaScript API
       - Add: Places API
     - Click "Save"
5. Add to `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Daily Quota:** 25,000 requests/day (free tier)

---

### 2. Hunter.io API (Email Finding)
**Purpose:** Find business email addresses from company websites

#### Setup Steps:
1. Go to [Hunter.io](https://hunter.io/)
2. Sign up for a free account
3. Go to [Account Settings](https://app.hunter.io/account/settings)
4. Find "API Key" section and copy your API key
5. Add to `.env.local`:
   ```
   HUNTER_IO_API_KEY=your_api_key_here
   ```

**Important:** Hunter.io free tier has **100 API calls/month**. For heavier usage, upgrade to a paid plan.

**Account Rotation Strategy:**
- You can create multiple Hunter.io accounts to work around the 100 calls/month limit
- Each account gets 100 calls, so:
  - 1 account = 100 calls/month
  - 2 accounts = 200 calls/month
  - 3 accounts = 300 calls/month
- The system supports multi-account rotation (to be implemented)

---

### 3. (Optional) RocketReach or Apollo.io
**Purpose:** Additional B2B contact databases for more email/phone data

#### RocketReach Setup:
1. Go to [RocketReach](https://rocketreach.co/)
2. Sign up for account
3. Get API key from settings
4. Add to `.env.local`: `ROCKREACH_API_KEY=your_key`

#### Apollo.io Setup:
1. Go to [Apollo.io](https://www.apollo.io/)
2. Sign up for account
3. Get API key from settings
4. Add to `.env.local`: `APOLLO_IO_API_KEY=your_key`

---

## Environment Variables Setup

Add these to your `.env.local` file:

```bash
# Google Maps API
GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE

# Hunter.io API
HUNTER_IO_API_KEY=YOUR_KEY_HERE

# ReBoost Settings
NEXT_PUBLIC_REBOOST_API_KEY=reboost_dev_key
REBOOST_API_KEY=reboost_dev_key
CRON_SECRET=your_cron_secret_token
```

---

## Testing the Setup

### 1. Test Google Maps Integration
```bash
curl -X POST http://localhost:3000/api/scrape/execute-search \
  -H "Content-Type: application/json" \
  -H "x-api-key: reboost_dev_key" \
  -d '{
    "niche": "Landscaping",
    "state": "Utah",
    "city": "Salt Lake City",
    "enrichWithEmails": true
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully scraped 15 new leads...",
  "results": {
    "leadsFound": 15,
    "newLeadsAdded": 15,
    "duplicatesSkipped": 0,
    "leadsProcessed": [...]
  }
}
```

### 2. Test Daily Scheduler
```bash
curl -X GET http://localhost:3000/api/scrape/daily \
  -H "x-cron-secret: your_cron_secret_token"
```

---

## Quota Management Strategy

### Daily Limits:
- **Google Maps:** 25,000 requests/day
- **Hunter.io (free):** ~3 calls/day (100/month ÷ 30 days)
- **Hunter.io (paid):** Depends on plan

### Smart Quota Usage:
1. **Batch Processing:** Run searches at scheduled times (e.g., 12:05 AM)
2. **Account Rotation:** 
   - Use multiple Hunter.io accounts to increase email finding capacity
   - Rotate which account is used each day
3. **Progressive Scraping:**
   - Don't scrape the same niche every day
   - Rotate between different niches throughout the week
   - Example:
     - Monday: Landscaping (nationwide)
     - Tuesday: Plumbing (nationwide)
     - Wednesday: HVAC (nationwide)
     - Thursday: Roofing (nationwide)
     - Friday: Pressure Washing (nationwide)

### Cost Optimization:
- Keep using free tiers as long as possible
- When ready to scale, upgrade Hunter.io to professional plan
- Consider Apollo.io or RocketReach as alternatives/supplements

---

## Troubleshooting

### "Google Maps API error: invalid_request"
- Check that API key is correct in `.env.local`
- Verify Google Maps API is enabled in Cloud Console
- Check that application restrictions allow your domain

### "Hunter.io rate limit exceeded"
- You've hit the daily/monthly quota for that account
- Wait for the quota to reset, or use a different account
- Upgrade to a paid plan for higher limits

### "API key not configured"
- Verify the key is in `.env.local` with correct variable name
- Restart the development server after changing `.env.local`
- Check that the key is not missing or malformed

---

## Multi-Account Setup (Advanced)

To use multiple accounts for quota rotation:

1. Create multiple accounts on Hunter.io, RocketReach, etc.
2. Store credentials in database:
   ```
   Account 1: hunter_key_1 (for Monday)
   Account 2: hunter_key_2 (for Tuesday)
   Account 3: hunter_key_3 (for Wednesday)
   ```
3. Update the scheduler to cycle through accounts

---

## Daily Usage Example

**Scenario:** You want to scrape "Landscaping" businesses in Utah daily

1. Configure a search:
   ```
   Niche: "Landscaping"
   State: "Utah"
   Active: true
   ```

2. System automatically:
   - Runs at 12:05 AM daily
   - Searches Google Maps for "Landscaping in Utah"
   - Finds ~50-100 results per run
   - Deduplicates against existing leads
   - Adds new leads to database
   - Enriches with emails via Hunter.io
   - Logs metrics: "Found 47 new landscaping leads today"

3. You can then:
   - Filter by city/location
   - Export to CSV
   - Push selected leads to GoHighLevel
   - Monitor growth over time

---

## Next Steps

1. Set up Google Maps API ✓
2. Set up Hunter.io API ✓
3. Add credentials to `.env.local` ✓
4. Test the search endpoint
5. Configure daily searches in dashboard
6. Set up cron job for daily automation
7. Integrate with GoHighLevel

---

## Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Maps API Docs](https://developers.google.com/maps)
- [Hunter.io Docs](https://hunter.io/api)
- [RocketReach Docs](https://api.rocketa.co/)
- [Apollo.io Docs](https://docs.apollo.io/)
