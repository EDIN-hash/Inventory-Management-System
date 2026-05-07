// Debug logging
const DEBUG_MODE = import.meta.env.DEV;

export function debugLog(level, message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`[${level}] ${timestamp}: ${message}`, data || '');
    }
}

// Utility functions for device identification and tracking

const DEVICE_ID_KEY = 'inventory_device_id';
const DEVICE_NAME_KEY = 'inventory_device_name';

export interface ImageOptimizeOptions {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
}

/**
 * Generate a stable device fingerprint based on hardware characteristics
 * Only uses stable data that doesn't change between sessions
 */
function generateFingerprint(): string {
    try {
        const nav = window.navigator;
        const screen = window.screen;
        
        const data = [
            nav.userAgent,
            nav.language,
            screen.colorDepth,
            `${screen.width}x${screen.height}`,
            nav.hardwareConcurrency || 'unknown',
            new Date().getTimezoneOffset()
        ].join('|');
        
        // Use base64 encoding for the data
        return 'DEV-' + btoa(data).substring(0, 24).replace(/[^A-Z0-9]/g, '').toUpperCase();
    } catch {
        return 'DEV-' + Date.now().toString(36).toUpperCase();
    }
}

/**
 * Get or generate a stable device ID
 * Saved in localStorage so it persists across sessions
 */
export function generateDeviceId(): string {
    try {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        
        if (!deviceId) {
            deviceId = generateFingerprint();
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        
        return deviceId;
    } catch {
        return generateFingerprint();
    }
}

/**
 * Get or set device nickname
 */
export function getDeviceName(): string {
    return localStorage.getItem(DEVICE_NAME_KEY) || '';
}

export function setDeviceName(name: string): void {
    localStorage.setItem(DEVICE_NAME_KEY, name);
}

/**
 * Get base device ID without nickname
 */
export function getDeviceBaseId(): string {
    return generateDeviceId();
}

/**
 * Get device nickname by username and device ID
 */
export function getDeviceNickname(_username: string, deviceId: string): string | null {
    try {
        const nicknames = JSON.parse(localStorage.getItem('device_nicknames') || '{}');
        return nicknames[deviceId] || null;
    } catch {
        return null;
    }
}

/**
 * Get combined device identifier for history
 * Format: "Nickname (Browser/OS)" or "DEV-ID (Browser/OS)"
 */
export function getDeviceDisplayId(): string {
    const deviceId = generateDeviceId();
    const deviceName = getDeviceName();
    
    let browser = 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Win';
    else if (ua.includes('Mac')) os = 'Mac';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    if (deviceName) {
        return `${deviceName} (${browser}/${os})`;
    }
    return `${deviceId} (${browser}/${os})`;
}

/**
 * Reset device ID - generates new one
 */
export function resetDeviceId(): string {
    try {
        const newId = generateFingerprint();
        localStorage.setItem(DEVICE_ID_KEY, newId);
        return newId;
    } catch {
        return generateFingerprint();
    }
}

/**
 * Get a more detailed device information string for display
 */
export function getDeviceId(): string {
    try {
        const info: string[] = [];
        
        // Browser info
        if (navigator.userAgent) {
            if (navigator.userAgent.includes('Chrome')) info.push('Chrome');
            else if (navigator.userAgent.includes('Firefox')) info.push('Firefox');
            else if (navigator.userAgent.includes('Safari')) info.push('Safari');
            else if (navigator.userAgent.includes('Edge')) info.push('Edge');
            else if (navigator.userAgent.includes('OPR')) info.push('Opera');
        }
        
        // Platform info
        if (navigator.platform) {
            if (navigator.platform.includes('Win')) info.push('Windows');
            else if (navigator.platform.includes('Mac')) info.push('Mac');
            else if (navigator.platform.includes('Linux')) info.push('Linux');
            else if (navigator.platform.includes('Android')) info.push('Android');
            else if (navigator.platform.includes('iPhone') || navigator.platform.includes('iPad')) info.push('iOS');
        }
        
        // Screen size
        if (window.screen) {
            info.push(`${window.screen.width}x${window.screen.height}`);
        }
        
        return info.join(' | ') || 'Unknown Device';
        
    } catch (error) {
        console.error('Error getting device info:', error);
        return 'Unknown Device';
    }
}

/**
 * Get optimized Cloudinary URL with transformations
 */
export function getOptimizedImageUrl(url: string, options: ImageOptimizeOptions = {}): string {
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }
    
    const {
        width = 800,
        height,
        quality = 'auto',
        format = 'auto',
        crop = 'fit'
    } = options;
    
    const parts = url.split('/upload/');
    if (parts.length !== 2) {
        return url;
    }
    
    const transformations: string[] = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);
    if (format) transformations.push(`f_${format}`);
    if (crop) transformations.push(`c_${crop}`);
    
    return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
}

/**
 * Get thumbnail URL for list view
 */
export function getThumbnailUrl(url: string): string {
    if (!url) return url;
    
    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/d\/([^/]+)/);
        if (fileIdMatch) {
            return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
        }
        return url;
    }
    
    return getOptimizedImageUrl(url, { width: 800, quality: 'auto', crop: 'fit' });
}

/**
 * Get full-size optimized URL for modal/lightbox
 */
export function getFullImageUrl(url: string): string {
    if (!url) return url;
    
    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/d\/([^/]+)/);
        if (fileIdMatch) {
            return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
        return url;
    }
    
    return getOptimizedImageUrl(url, { width: 1920, quality: 'auto' });
}
