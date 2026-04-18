# Firebase Environment Variables Setup

## Local Development ✓

The `.env.local` file has been created with all required Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAP1wZXbFzxIfjukcOKoZKXA3t1GYVZlUA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=reboost-leads.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reboost-leads
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=reboost-leads.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=960696544955
NEXT_PUBLIC_FIREBASE_APP_ID=1:960696544955:web:c2af891540570a986f839e
```

The project builds successfully and is ready for local testing.

## Vercel Production Deployment

To enable authentication on the deployed application at https://leadgen-swart.vercel.app, you need to add the above 6 environment variables to Vercel.

### Manual Steps in Vercel Dashboard:

1. Go to https://vercel.com/reboostms-projects/leadgen/settings/environment-variables
2. Click "Add Environment Variable"
3. For each of the 5 remaining variables (the API_KEY is already added):
   - Copy the key name exactly
   - Paste the value
   - Click "Save"

#### Variables to Add:

| Key | Value |
|-----|-------|
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | reboost-leads.firebaseapp.com |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | reboost-leads |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | reboost-leads.firebasestorage.app |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | 960696544955 |
| NEXT_PUBLIC_FIREBASE_APP_ID | 1:960696544955:web:c2af891540570a986f839e |

### Via Vercel CLI (Alternative):

If you have the Vercel CLI installed and authenticated:

```bash
cd reboost-leads-main
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
```

### After Adding Variables:

1. All 6 variables should appear in the Environment Variables list
2. Vercel will automatically redeploy with the new configuration
3. Navigate to https://leadgen-swart.vercel.app/login to test
4. Authentication should work with Firebase

## Testing Locally

To test the application locally with the Firebase configuration:

```bash
npm run dev
```

Navigate to http://localhost:3000/login and test the login flow using a test user created in the Firebase Console.
