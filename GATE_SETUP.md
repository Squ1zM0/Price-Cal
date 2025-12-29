# Gate Authentication Setup

This document describes the simple access gate feature that protects the app with a single password and optional Face ID authentication.

## Overview

The app now requires authentication via a `/gate` page before accessing any other pages. This uses:
- **One preset password** (environment variable)
- **Optional Face ID** (WebAuthn/Passkeys) after first login
- **No database** - Face ID credentials stored in-memory only
- **Simple session cookie** - 30-day persistent login

## Environment Setup

### Required Environment Variable

Set the `GATE_PASSWORD` environment variable:

**For Development (.env.local):**
```bash
GATE_PASSWORD=Soccer123$
```

**For Production (Vercel):**
Add the environment variable in your Vercel project settings:
- Go to Project Settings → Environment Variables
- Add `GATE_PASSWORD` with your chosen password
- **Never commit the actual password to the repository**

### Security Notes

⚠️ **Important:**
- Never hardcode the password in the codebase
- Never commit `.env.local` to the repository (it's in `.gitignore`)
- Use a strong password for production
- The password is only compared server-side
- Generic error messages prevent enumeration attacks

## Features

### 1. Password Authentication
- Enter the password on `/gate` page
- On success, sets `pc_gate` session cookie (30 days)
- Rate-limited to prevent brute force (5 attempts per 15 minutes per IP)

### 2. Optional Face ID
- After successful password entry, users are prompted to enable Face ID
- Uses WebAuthn (Face ID, Touch ID, Windows Hello, etc.)
- Can skip and use password only
- Face ID can be used for future logins

### 3. Session Management
- 30-day persistent session via httpOnly cookie
- Sign out clears the session cookie
- Sign out button in the app header menu

### 4. Middleware Protection
All routes are protected except:
- `/gate` - The login page
- `/api/gate/*` - Authentication APIs
- `/api/webauthn/*` - Face ID APIs
- Static assets and Next.js internals

## In-Memory Storage Tradeoff

⚠️ **Important Limitation:**

Face ID credentials are stored **in-memory only**. This means:
- All Face ID registrations are **lost on server restart/redeploy**
- Users must **re-register Face ID** after each deployment
- Password authentication always works

**Why this approach:**
- Zero database complexity
- Acceptable for private/internal tools
- Face ID is a convenience feature, not critical
- Password is the primary authentication method

## API Routes

The following API routes are implemented:

- `POST /api/gate/verify` - Verify password and set session
- `POST /api/gate/signout` - Clear session and sign out
- `POST /api/webauthn/register/options` - Get Face ID registration options
- `POST /api/webauthn/register/verify` - Verify Face ID registration
- `POST /api/webauthn/login/options` - Get Face ID login options
- `POST /api/webauthn/login/verify` - Verify Face ID login

## Testing

### Test Password Authentication
1. Navigate to `http://localhost:3000`
2. You'll be redirected to `/gate`
3. Enter the password from `GATE_PASSWORD`
4. You should be logged in and redirected to `/calculator`

### Test Sign Out
1. Click the menu button (top right)
2. Click "Sign Out"
3. You should be redirected to `/gate`

### Test Middleware Protection
1. Sign out or clear cookies
2. Try to navigate to `/calculator` or any protected route
3. You should be redirected to `/gate`

### Test Rate Limiting
1. Enter wrong password 5 times
2. The 6th attempt should show "Too many attempts. Please try again later."

## Face ID Notes

Face ID/WebAuthn requires:
- HTTPS (or localhost for development)
- Supported device/browser (iOS Safari, macOS Safari, Chrome on Android, Windows Hello, etc.)
- User gesture (button click)

On localhost, Face ID will work but may not be available on all devices.

## Cookie Details

**Name:** `pc_gate`  
**Value:** `1`  
**Attributes:**
- `httpOnly: true` - Cannot be accessed by JavaScript
- `secure: true` (production only) - Only sent over HTTPS
- `sameSite: lax` - CSRF protection
- `path: /` - Available to all routes
- `maxAge: 2592000` - 30 days in seconds

## Security Measures

1. **Rate Limiting:** 5 attempts per 15 minutes per IP
2. **Generic Errors:** Always show "Incorrect password" for failed attempts
3. **httpOnly Cookies:** Session cookie not accessible to JavaScript
4. **Secure Flag:** Cookie only sent over HTTPS in production
5. **Server-Side Verification:** Password never sent to client
6. **No Logging:** Password never logged anywhere

## Troubleshooting

### "Server configuration error"
- The `GATE_PASSWORD` environment variable is not set
- Check your `.env.local` or Vercel environment variables

### Face ID not working
- Ensure you're on HTTPS (or localhost)
- Check if your device/browser supports WebAuthn
- Face ID credentials are lost on server restart (expected behavior)

### Redirect loop
- Clear your browser cookies
- Verify middleware configuration
- Check console for errors

## Future Enhancements (Optional)

If database storage becomes desired:
- Add database for WebAuthn credentials (e.g., Vercel KV, Redis)
- Persist Face ID registrations across deployments
- Add multiple user support (if needed)

For now, the in-memory approach keeps things simple and avoids database complexity.
