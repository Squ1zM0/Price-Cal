# Client-Only Gate Feature

## Overview
This application implements a simple client-only access gate as a **convenience lock** for casual access prevention. This is **NOT** a secure authentication system and should not be used to protect sensitive data or server endpoints.

## Features

### 1. One-Time Setup Password
- User enters a setup password on first access at `/gate`
- Password is stored in environment variable `NEXT_PUBLIC_GATE_PASSWORD`
- **WARNING**: The password is exposed in the client bundle - this is acceptable only because it's a convenience lock

### 2. Mandatory Face ID/Biometric Authentication
- After successful password entry, users are prompted to set up Face ID
- Uses WebAuthn/Passkeys for platform biometric authentication
- Face ID setup is required for enhanced security (users cannot skip)
- If Face ID setup fails or is cancelled, the device is still approved without Face ID as a fallback
- Face ID only works on devices with platform authenticators (Touch ID, Face ID, Windows Hello, etc.)

### 3. Device Approval Persistence
- Device approval is stored in localStorage with these keys:
  - `pc_device_approved` - "1" if approved
  - `pc_device_approved_at` - ISO timestamp of approval
  - `pc_face_id_enabled` - "1" if Face ID is enabled, "0" otherwise
  - `pc_credential_id` - WebAuthn credential ID (if Face ID enabled)
- Persists across reloads and redeploys
- No server-side storage

## Setup

### Environment Configuration

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Set your gate password:
   ```env
   NEXT_PUBLIC_GATE_PASSWORD=YourStrongPasswordHere123$
   ```

3. For production deployments (Vercel, Netlify, etc.), set the environment variable in your hosting platform's dashboard.

## How It Works

### First Visit Flow
1. User navigates to app → automatically redirected to `/gate`
2. User enters setup password
3. If correct:
   - Modal appears requiring Face ID setup
   - User clicks "Set Up Face ID" to proceed with enrollment
   - If Face ID setup succeeds: WebAuthn credential is created and stored
   - If Face ID setup fails or is cancelled: Device is approved without Face ID as a fallback
4. User is redirected to `/calculator` (or intended page)
5. Approval is saved to localStorage

### Subsequent Visits
- User navigates to app
- GateGuard checks localStorage for `pc_device_approved`
- If approved and Face ID is NOT enabled: User proceeds to app immediately
- If approved and Face ID IS enabled: User is prompted to authenticate with Face ID
- If not approved: User is redirected to `/gate`

### Face ID Flow
- When Face ID is enabled during setup, it becomes required for all subsequent app opens
- The app prompts for Face ID authentication when:
  - The app is reopened after being closed or terminated
  - The app comes to foreground after being backgrounded
  - On initial load if Face ID is enabled
- The Page Visibility API is used to detect when the app returns to foreground
- If Face ID authentication fails or is cancelled, the user is redirected to `/gate` to re-authenticate with password

## Security Considerations

⚠️ **Important**: This is a **convenience lock**, not a security system.

### What This Does
✅ Prevents casual access by people who don't know the password  
✅ Provides a smooth UX with biometric unlock  
✅ Works entirely client-side with no backend required  
✅ Requires Face ID authentication on every app reopen when Face ID is enabled  
✅ Detects when app comes to foreground and prompts for authentication  

### What This Does NOT Do
❌ Does NOT protect against determined attackers  
❌ Does NOT secure server endpoints or API routes  
❌ Does NOT prevent password extraction from client bundle  
❌ Does NOT provide account-based authentication  
❌ Does NOT work across devices (approval is per-device)  

### Best Practices
- Use this only for applications that don't handle sensitive data
- Never rely on this as the sole protection for confidential information
- Consider this equivalent to a "PIN lock" on a tablet app
- For actual security, implement server-side authentication

## Architecture

### Components
- **`GateContext`** (`app/contexts/GateContext.tsx`) - Manages device approval state and Face ID
- **`GateGuard`** (`app/components/GateGuard.tsx`) - Protects routes and redirects unapproved devices
- **`GatePage`** (`app/gate/page.tsx`) - Password entry and Face ID enrollment UI
- **`getGatePassword()`** (`app/lib/gate.ts`) - Utility to retrieve password from env

### Integration
The gate is integrated into the root layout:
```tsx
<ThemeProvider>
  <GateProvider>
    <GateGuard>{children}</GateGuard>
  </GateProvider>
</ThemeProvider>
```

## Clearing Device Approval

For testing or troubleshooting, clear device approval by:
1. Opening browser DevTools
2. Go to Application → Local Storage
3. Delete keys starting with `pc_`
4. Refresh the page

Or programmatically:
```javascript
localStorage.removeItem('pc_device_approved');
localStorage.removeItem('pc_device_approved_at');
localStorage.removeItem('pc_face_id_enabled');
localStorage.removeItem('pc_credential_id');
```

## Browser Compatibility

### Password Gate
Works in all modern browsers.

### Face ID/WebAuthn
Requires browsers with WebAuthn support:
- ✅ Safari 14+ (iOS/macOS with Touch ID/Face ID)
- ✅ Chrome 67+ (with platform authenticator)
- ✅ Edge 79+
- ✅ Firefox 60+

On unsupported browsers, the Face ID option is automatically skipped.

## License
This feature is part of the Price Calculator application and follows the same license.
