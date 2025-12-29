# Admin System Setup Guide

This guide explains how to set up and use the lightweight admin system for the Price-Cal application.

## Overview

The admin system provides access control without requiring a database. All configuration is managed through environment variables on Vercel.

## Initial Setup (Bootstrap Mode)

### Step 1: Set Bootstrap Admin Code

In your Vercel project settings, add the following environment variable:

```
BOOTSTRAP_ADMIN_CODE=your-secure-code-here
```

**Important:** Choose a strong, unique code. This is your emergency access code.

### Step 2: Deploy

Deploy your application to Vercel.

### Step 3: Access Bootstrap Admin

1. Visit your application URL
2. Enter your `BOOTSTRAP_ADMIN_CODE` at the gate
3. You'll be redirected to the admin panel in bootstrap mode

### Step 4: Create Your First Admin Code

1. In the admin panel, set:
   - **Role:** Admin
   - **Label:** (e.g., "Owner - Your Name")
   - **Expires At:** (optional)
   - **Max Devices:** (optional)
2. Click **Generate Code**
3. **IMPORTANT:** Save the generated code immediately - it won't be shown again!

### Step 5: Update Environment Variables

1. Copy the environment variable snippet from the admin panel
2. Go to Vercel → Your Project → Settings → Environment Variables
3. Update both variables:
   - `ACCESS_CODES`
   - `ADMIN_CODE_IDS`
4. Redeploy your application

### Step 6: Verify

After redeployment:
- Bootstrap mode is now disabled
- Use your new admin code to access the admin panel
- The bootstrap code still works but only if you remove all admin codes

## Regular Use

### Accessing the Application

**For Regular Users:**
- Visit the app and enter your user access code
- You'll be directed to the calculator

**For Admins:**
- Visit the app and enter your admin access code
- You'll have access to both the calculator and admin panel

### Managing Access Codes

#### Generate New Code

1. Log in as an admin
2. Go to Admin → Access Code Management
3. Fill in the form:
   - **Role:** Admin or User
   - **Label:** Descriptive name (e.g., "Shop iPad", "John's Phone")
   - **Expires At:** Optional expiration date
   - **Max Devices:** Optional device limit
4. Click **Generate Code**
5. Save the generated code immediately

#### Revoke Code

1. In the admin panel, find the code in the table
2. Click **Revoke**
3. Copy the updated environment variables
4. Update in Vercel and redeploy

## Environment Variable Format

### ACCESS_CODES

Semicolon-separated records with pipe-delimited fields:

```
code_id|code_value|role|label|expiresAt|maxDevices
```

Example:
```
ACCESS_CODES=ac_abc123|PC-A1B2-C3D4-E5F6|admin|Owner||5;ac_def456|PC-G7H8-I9J0-K1L2|user|Shop iPad|2026-06-01|1
```

### ADMIN_CODE_IDS

Comma-separated list of admin code IDs:

```
ADMIN_CODE_IDS=ac_abc123,ac_xyz789
```

### BOOTSTRAP_ADMIN_CODE

Single emergency access code:

```
BOOTSTRAP_ADMIN_CODE=your-secure-code
```

## Security Best Practices

1. **Keep Bootstrap Code Secure:** Never share your bootstrap code
2. **Use Strong Codes:** Even though codes are auto-generated, treat them as passwords
3. **Regular Audits:** Periodically review and revoke unused codes
4. **Expiration Dates:** Set expiration dates for temporary access
5. **Device Limits (Planned):** The `maxDevices` setting is currently not enforced and is reserved for future use. Do not rely on it to limit code sharing.
6. **HTTPS Only:** Always use HTTPS in production (automatic on Vercel)

## Troubleshooting

### Locked Out?

If you lose all admin codes:
1. Remove all entries from `ACCESS_CODES` and `ADMIN_CODE_IDS`
2. Redeploy
3. Bootstrap mode will activate automatically
4. Use your `BOOTSTRAP_ADMIN_CODE` to access
5. Create new admin codes

### Code Not Working?

- Check that the code is entered exactly as generated
- Verify environment variables are correctly set in Vercel
- Ensure you've redeployed after updating environment variables
- Check if the code has expired (if expiration was set)

### Can't Access Admin Panel?

- Verify you're using an admin code (not a user code)
- Check that the code ID is listed in `ADMIN_CODE_IDS`
- Clear browser cookies and try again

## Routes

- `/gate` - Access code entry
- `/calculator` - Main application (requires any valid code)
- `/admin/access` - Admin panel (requires admin code)

## API Endpoints

- `POST /api/gate/verify` - Verify access code
- `GET /api/admin/codes` - Fetch current codes (admin only)

## Support

For issues or questions, please refer to the main README or create an issue in the repository.
