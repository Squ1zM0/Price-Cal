/**
 * Utility functions for device-based authorization
 */

const APPROVED_DEVICES_KEY = 'approvedDevices';
const DEVICE_ID_KEY = 'deviceId';

/**
 * Generates a unique device ID based on browser fingerprint
 * Falls back to random ID if stored ID doesn't exist
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  // Check if we already have a device ID stored
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a new device ID using random string
    deviceId = generateRandomId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Generates a random device ID
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Checks if the current device is approved
 */
export function isDeviceApproved(): boolean {
  if (typeof window === 'undefined') return false;
  
  const deviceId = getDeviceId();
  const approvedDevices = getApprovedDevices();
  
  return approvedDevices.includes(deviceId);
}

/**
 * Gets the list of approved device IDs
 */
export function getApprovedDevices(): string[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(APPROVED_DEVICES_KEY);
  
  if (!stored) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing approved devices:', error);
    return [];
  }
}

/**
 * Adds a device ID to the approved list
 */
export function approveDevice(deviceId: string): void {
  if (typeof window === 'undefined') return;
  
  const approvedDevices = getApprovedDevices();
  
  if (!approvedDevices.includes(deviceId)) {
    approvedDevices.push(deviceId);
    localStorage.setItem(APPROVED_DEVICES_KEY, JSON.stringify(approvedDevices));
  }
}

/**
 * Removes a device ID from the approved list
 */
export function revokeDevice(deviceId: string): void {
  if (typeof window === 'undefined') return;
  
  const approvedDevices = getApprovedDevices();
  const filtered = approvedDevices.filter(id => id !== deviceId);
  
  localStorage.setItem(APPROVED_DEVICES_KEY, JSON.stringify(filtered));
}

/**
 * Gets device information for the access request email
 */
export function getDeviceInfo(): {
  deviceId: string;
  browser: string;
  platform: string;
  timestamp: string;
} {
  if (typeof window === 'undefined') {
    return {
      deviceId: '',
      browser: '',
      platform: '',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    deviceId: getDeviceId(),
    browser: navigator.userAgent,
    platform: navigator.platform,
    timestamp: new Date().toISOString(),
  };
}
