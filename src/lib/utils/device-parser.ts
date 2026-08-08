export interface ParsedDeviceInfo {
  deviceName: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
}

/**
  * Parse User-Agent string to extract human-readable device, browser, and OS metadata.
  * Zero external dependencies. Fast and memory-efficient.
  */
export function parseUserAgent(ua?: string): ParsedDeviceInfo {
  if (!ua || typeof ua !== 'string') {
    return {
      deviceName: 'Unknown Device',
      browserName: 'Unknown Browser',
      browserVersion: '',
      osName: 'Unknown OS',
      osVersion: '',
    };
  }

  // 1. Detect Operating System
  let osName = 'Unknown OS';
  let osVersion = '';

  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    osName = ua.includes('iPad') ? 'iPadOS' : 'iOS';
    const match = ua.match(/OS (\d+[_.\d]+)/);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    osName = 'macOS';
    const match = ua.match(/Mac OS X (\d+[_.\d]+)/);
    if (match) osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Android')) {
    osName = 'Android';
    const match = ua.match(/Android (\d+[\.\d]+)/);
    if (match) osVersion = match[1];
  } else if (ua.includes('Windows NT')) {
    osName = 'Windows';
    if (ua.includes('Windows NT 10.0')) osVersion = '10/11';
    else if (ua.includes('Windows NT 6.3')) osVersion = '8.1';
    else if (ua.includes('Windows NT 6.2')) osVersion = '8';
    else if (ua.includes('Windows NT 6.1')) osVersion = '7';
  } else if (ua.includes('Linux')) {
    osName = 'Linux';
  }

  // 2. Detect Browser
  let browserName = 'Unknown Browser';
  let browserVersion = '';

  if (ua.includes('Edg/')) {
    browserName = 'Edge';
    const match = ua.match(/Edg\/(\d+[\.\d]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+[\.\d]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+[\.\d]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+[\.\d]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browserName = 'Opera';
    const match = ua.match(/(?:Opera|OPR)\/(\d+[\.\d]+)/);
    if (match) browserVersion = match[1];
  }

  // 3. Detect Device Type
  let deviceName = 'Desktop';
  if (ua.includes('iPhone')) deviceName = 'iPhone';
  else if (ua.includes('iPad')) deviceName = 'iPad';
  else if (ua.includes('Android')) {
    deviceName = ua.includes('Mobile') ? 'Android Mobile' : 'Android Tablet';
  } else if (ua.includes('Macintosh')) deviceName = 'Mac';
  else if (ua.includes('Windows')) deviceName = 'Windows PC';
  else if (ua.includes('Linux')) deviceName = 'Linux Workstation';

  return {
    deviceName,
    browserName,
    browserVersion,
    osName,
    osVersion,
  };
}

/**
 * Format IP Address location label cleanly.
 */
export function getLocationLabel(ipAddress?: string): string {
  if (!ipAddress) return 'Unknown Location';

  const cleanIp = ipAddress.split(',')[0].trim();
  if (cleanIp === '::1' || cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    return 'Local Network / Internal';
  }

  return `IP: ${cleanIp}`;
}
