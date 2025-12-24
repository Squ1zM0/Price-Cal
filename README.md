# HVAC Price Calculator (Expo / React Native)

## What this is
A simple mobile pricing calculator for HVAC jobs.

### Rates
- Commercial x1 tech: $150/hr
- Residential x1 tech: $125/hr
- Commercial x2 tech: $200/hr
- Residential x2 tech: $175/hr

### Formula
Final = ( (Material + Tax) + (Hours × HourlyRate) ) / 0.65 × 1.05 × 1.10

### Wiggle buttons
- Wiggle Down: -5% to -15% (random)
- Wiggle Up: +5% to +15% (random)

## Run it locally
1. Install Node.js (LTS)
2. Install Expo CLI (optional): `npm i -g expo`
3. In this folder:
   - `npm install`
   - `npm run start`

Then scan the QR code in Expo Go (iOS/Android) to test on your phone.

## Notes
- Tax rate default is 8.0% when tax is NOT included.
- You can change the tax rate field anytime.
