# Firebase API Key Configuration Guide

## Problem
The Firebase authentication is failing with error: `auth/invalid-api-key`

This error occurs when the Firebase API key is either:
- Not properly configured in Google Cloud Console
- Has domain restrictions that don't include your deployment domain
- Missing required API permissions

## Solution

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're viewing the correct project (should be "reboost-leads")
3. Navigate to **APIs & Services** → **Credentials**

### Step 2: Find and Edit the API Key
1. Look for the API key: `AIzaSyAP1wZXbFzxIfjukcOKoZKXA3t1GYVZlUA`
2. Click on it to open the edit dialog

### Step 3: Configure Application Restrictions
In the **Application restrictions** section:

**Option A: For Development/Testing**
- Set to **None** (least secure, fine for testing)

**Option B: For Production** 
- Select **Websites**
- Add the domain: `leadgen-swart.vercel.app`
- Also add: `localhost:3000` (for local development)

### Step 4: Configure API Restrictions
In the **API restrictions** section:
- Select **Restrict key**
- Add these APIs:
  - **Identity Toolkit API** (required for Firebase Auth)
  - **Google Identity and Access Management (IAM) API** (if available)
  - Or search for "Firebase" and add all Firebase-related APIs

**Alternatively**, you can leave it as **Unrestricted** for testing.

### Step 5: Save Changes
1. Click **Save** to apply the changes
2. Wait 1-2 minutes for the changes to propagate

### Step 6: Trigger a New Deployment
Once the API key is fixed, trigger a new Vercel deployment:

```bash
git push origin master:main
```

Or manually trigger a redeploy in the Vercel dashboard.

## Verification

After applying the changes:

1. Wait 2-3 minutes for Google Cloud to propagate the changes
2. Go to https://leadgen-swart.vercel.app/login
3. The page should load without errors
4. You should see the ReBoot Leads login form

## Troubleshooting

### Still getting "invalid-api-key" error?

1. **Clear browser cache**: The browser might be caching the old error
   - Press F12 to open Developer Tools
   - Right-click the Refresh button → "Empty cache and hard refresh"

2. **Check API is enabled**: Make sure the **Identity Toolkit API** is enabled in Google Cloud Console
   - Go to **APIs & Services** → **Enabled APIs & Services**
   - Search for "Identity Toolkit"
   - If not enabled, click **Enable**

3. **Verify project ID**: Make sure the project ID matches
   - In Firebase Console, your project ID should be: `reboost-leads`
   - In Google Cloud Console, verify you're looking at the same project

4. **Check Vercel environment variables**: Confirm all 6 Firebase variables are set
   ```bash
   vercel env ls
   ```

### If the API key is compromised:

If you suspect the API key has been exposed, you should rotate it:

1. In Google Cloud Console → **APIs & Services** → **Credentials**
2. Click the three dots next to the API key
3. Select **Delete**
4. Create a new API key following the same steps above
5. Update Vercel environment variables with the new key:
   ```bash
   vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   ```

## Firebase Setup Checklist

- [ ] Google Cloud project created
- [ ] Firebase initialized in the project
- [ ] API key created and properly configured
- [ ] Identity Toolkit API enabled
- [ ] Application restrictions set to allow Vercel domain
- [ ] Environment variables added to Vercel
- [ ] Deployment triggered and completed successfully
- [ ] Login page loads without errors
- [ ] Firebase authentication is working

## Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
