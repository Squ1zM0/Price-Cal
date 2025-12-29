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

### Optional WebAuthn/Face ID Configuration

**For Vercel Deployments:**
No additional configuration needed! The app automatically detects the Vercel environment.

**For Custom Domains or Non-Vercel Deployments:**
If you're deploying to a custom domain or non-Vercel environment, you need to set these environment variables:

```bash
# The domain name without protocol (e.g., "yourdomain.com" or "localhost")
NEXT_PUBLIC_RP_ID=yourdomain.com

# The full origin URL with protocol (e.g., "https://yourdomain.com" or "http://localhost:3000")
NEXT_PUBLIC_ORIGIN=https://yourdomain.com

# (Optional) The human-readable name shown during Face ID prompts
NEXT_PUBLIC_RP_NAME=Price Calculator
```

**Why these are needed:**
- WebAuthn (Face ID/Touch ID) requires precise configuration of the domain and origin
- The `RP_ID` (Relying Party ID) must match your actual domain
- The `ORIGIN` must match the URL where your app is hosted
- On Vercel, these are automatically detected from `VERCEL_URL`
- For other deployments, you must set them explicitly

**Examples:**

*For a custom domain:*
```bash
NEXT_PUBLIC_RP_ID=myapp.example.com
NEXT_PUBLIC_ORIGIN=https://myapp.example.com
```

*For localhost development:*
```bash
# These are the defaults, so you don't need to set them for local development
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_ORIGIN=http://localhost:3000
```

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
- **Ensure you're on HTTPS (or localhost)** - WebAuthn requires a secure context
- **Check if your device/browser supports WebAuthn** - iOS Safari, macOS Safari, Chrome on Android, Windows Hello, etc.
- **For custom domains or non-Vercel deployments:** Set `NEXT_PUBLIC_RP_ID` and `NEXT_PUBLIC_ORIGIN` environment variables to match your domain
- **Face ID credentials are lost on server restart** (expected behavior with in-memory storage)
- **Check browser console for errors** - Look for WebAuthn-specific error messages
- **Verify RP_ID and ORIGIN configuration:**
  - RP_ID should be just the domain (e.g., "example.com" or "localhost")
  - ORIGIN should be the full URL with protocol (e.g., "https://example.com" or "http://localhost:3000")
  - These must match your actual deployment URL exactly

### "Failed to enable Face ID" or "Failed to get registration options"
- This typically means the WebAuthn configuration doesn't match your deployment environment
- **Solution:** Set the `NEXT_PUBLIC_RP_ID` and `NEXT_PUBLIC_ORIGIN` environment variables
- Example for a custom domain `myapp.com`:
  ```bash
  NEXT_PUBLIC_RP_ID=myapp.com
  NEXT_PUBLIC_ORIGIN=https://myapp.com
  ```
- After setting these, restart your development server or redeploy

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
