# Access Gate & Face ID Implementation

This document describes the multi-code access gate and Face ID (Passkeys/WebAuthn) authentication system implemented for Price-Cal.

## Overview

The application now requires authentication before access. Users can authenticate using:
1. **Access Codes** - Multiple shareable codes for first-time entry
2. **Face ID/Touch ID** - Optional biometric authentication via Passkeys (WebAuthn) for returning users

## Features

### 🔐 Access Gate
- Multiple access codes support (comma-separated in environment variables)
- Constant-time string comparison for security
- httpOnly session cookies (30-day expiration)
- Clean, mobile-friendly UI with dark mode support

### 👤 Face ID (Passkeys)
- Optional enrollment after successful code entry
- Uses WebAuthn/Passkeys standard (iOS Face ID, Touch ID, etc.)
- One-tap authentication for returning users
- Credential storage in browser's secure authenticator

### 🛡️ Security Features
- Constant-time code comparison prevents timing attacks
- httpOnly cookies prevent XSS attacks
- Secure cookie settings (secure flag in production)
- No access codes stored in repository
- Server-side validation for all authentication

## Setup

### Environment Variables

Create a `.env.local` file (or configure in Vercel):

```bash
# Required: Comma-separated access codes
ACCESS_CODES=CODE1,CODE2,CODE3

# Required for production Passkeys:
RP_NAME=Accutrol Pricing Calculator
RP_ID=yourdomain.com
ORIGIN=https://yourdomain.com
```

### Local Development

For local development, use:
```bash
RP_ID=localhost
ORIGIN=http://localhost:3000
```

### Production (Vercel)

In Vercel dashboard, set environment variables:
- `ACCESS_CODES` - Your actual access codes (keep secret!)
- `RP_ID` - Your domain (e.g., `yourdomain.vercel.app`)
- `RP_NAME` - Display name for the app
- `ORIGIN` - Full origin URL (e.g., `https://yourdomain.vercel.app`)

## User Flow

### First-Time User
1. User visits the app → Redirected to `/gate`
2. User enters an access code
3. Code is validated server-side
4. On success, user sees "Enable Face ID" option
5. User can either:
   - Enable Face ID (requires biometric enrollment)
   - Skip and proceed to the app

### Returning User with Face ID
1. User visits the app → Redirected to `/gate`
2. "Sign in with Face ID" button is displayed
3. User taps the button → Device prompts for biometric
4. On success → Immediate access to the app

### Session Persistence
- Sessions last 30 days via httpOnly cookies
- Users don't need to re-authenticate during this period
- Cookies: `pc_gate=1`, `pc_gate_code` (prefix), `pc_passkey=1`

## Implementation Details

### Routes

- **`/gate`** - Authentication page (public)
- **`/api/gate/verify`** - POST endpoint to verify access codes
- **`/api/passkey/register`** - GET/POST for Passkey enrollment
- **`/api/passkey/verify`** - GET/POST for Passkey authentication

### Middleware

`/middleware.ts` protects all routes except:
- `/gate` - The authentication page
- `/api/gate/*` - Gate verification endpoints
- `/api/passkey/*` - Passkey endpoints
- Static files and Next.js internals

### Libraries

- **@simplewebauthn/server** - Server-side WebAuthn/Passkey handling
- **@simplewebauthn/browser** - Client-side WebAuthn/Passkey handling

## Security Considerations

### Access Codes
- ✅ Never commit codes to repository
- ✅ Use environment variables
- ✅ Constant-time comparison prevents timing attacks
- ✅ Server-side validation only
- ⚠️ Codes are shared secrets - rotate periodically

### Passkeys
- ✅ Credentials never leave the device
- ✅ Biometric data stays on device
- ✅ Public key cryptography
- ✅ Phishing resistant
- ⚠️ In-memory storage for demo (use database in production)

### Cookies
- ✅ httpOnly flag prevents JavaScript access
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite=Lax prevents CSRF
- ⚠️ 30-day expiration (adjust as needed)

## Production Considerations

### Database for Passkeys
The current implementation uses in-memory storage for Passkeys. For production:

```typescript
// Use a database (PostgreSQL, MongoDB, etc.)
interface StoredCredential {
  userId: string;
  credentialID: Uint8Array;
  credentialPublicKey: Uint8Array;
  counter: number;
  transports?: string[];
}
```

### Code Rotation
To rotate an access code:
1. Update `ACCESS_CODES` in Vercel
2. Redeploy (or wait for environment variable propagation)
3. Old codes immediately stop working

### Monitoring
Consider adding:
- Failed authentication attempt logging
- Rate limiting on `/api/gate/verify`
- Analytics on access code usage
- Alert on suspicious patterns

## Testing

### Test with Access Codes
1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. You'll be redirected to `/gate`
4. Enter `TEST123`, `DEMO456`, or `SAMPLE789`

### Test Face ID (requires HTTPS in production)
1. Enter a valid access code
2. Click "Enable Face ID"
3. Complete biometric enrollment on your device
4. Clear cookies and revisit the app
5. Click "Sign in with Face ID"

### Test Invalid Codes
1. Visit `/gate`
2. Enter an invalid code like `WRONGCODE`
3. Should see "Invalid access code" error

## Browser Support

### Passkeys/WebAuthn Support
- ✅ iOS 16+ (Face ID, Touch ID)
- ✅ macOS Safari 16+ (Touch ID)
- ✅ Chrome/Edge 67+ (Windows Hello, fingerprint)
- ✅ Android Chrome (fingerprint, face unlock)
- ❌ Older browsers fallback to access codes only

## Troubleshooting

### "Failed to get registration options"
- Check that you've entered a valid access code first
- Verify environment variables are set correctly

### Passkeys not working in production
- Ensure `RP_ID` matches your domain exactly
- Ensure `ORIGIN` includes `https://`
- Check browser DevTools console for errors

### Access codes not working
- Verify `ACCESS_CODES` is set in environment
- Check for trailing spaces in codes
- Ensure comma separation (no quotes needed)

## Screenshots

### Light Mode - Access Code Entry
![Access Gate Light](https://github.com/user-attachments/assets/01aa9a6a-9e95-4a89-b904-410a80f73470)

### Success - Face ID Enrollment Option
![Access Granted](https://github.com/user-attachments/assets/67a1fea1-9622-46e7-b176-1cf06174b2f1)

### Dark Mode Support
![Dark Mode](https://github.com/user-attachments/assets/b2292087-2760-40f7-8ea5-34146d790c8d)

### Error State
![Invalid Code](https://github.com/user-attachments/assets/ae0d7fb5-29ee-4c02-86c6-d3cf6eb41620)
