import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-pwa-secret-key-change-in-production';
const TOKEN_EXPIRY_HOURS = 24;

// ============================================
// DEBUG LOGGING SYSTEM
// ============================================
const DEBUG_MODE = process.env.DEBUG === 'true' || process.env.DEBUG === '1';

function debugLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const colors = {
        DEBUG: '\x1b[36m',
        INFO: '\x1b[32m',
        WARN: '\x1b[33m',
        ERROR: '\x1b[31m'
    };
    const reset = '\x1b[0m';
    
    const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data })
    };
    
    if (DEBUG_MODE) {
        console.log(`${colors[level]}[${level}]${reset}`, message, data || '');
    }
    
    // Always log errors
    if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry));
    }
}

// ============================================
// PASSWORD HASHING (bcrypt)
// ============================================
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    debugLog('DEBUG', 'Password hashed successfully', { length: hash.length });
    return hash;
}

async function verifyPassword(password, hash) {
    const isValid = await bcrypt.compare(password, hash);
    debugLog('DEBUG', 'Password verified', { valid: isValid });
    return isValid;
}

// ============================================
// JWT TOKEN SYSTEM
// ============================================
function createToken(username, role) {
    const payload = {
        username,
        role,
        iat: Math.floor(Date.now() / 1000)
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: `${TOKEN_EXPIRY_HOURS}h`
    });
    
    debugLog('DEBUG', 'JWT token created', { username, role });
    return token;
}

function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        debugLog('DEBUG', 'JWT token verified', { username: decoded.username });
        return decoded;
    } catch (error) {
        debugLog('WARN', 'JWT token verification failed', { error: error.message });
        return null;
    }
}

// ============================================
// PARSE POLISH NUMBER (enhanced)
// ============================================
function parsePolishNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    
    // 1. Remove spaces
    // 2. If both . and , exist (e.g. 1.250,50), remove the dot
    // 3. Replace comma with dot
    const cleanValue = String(value)
        .replace(/\s/g, '')
        .replace(/\.(?=[^,]*?,)/g, '')
        .replace(',', '.');
    
    const numericValue = parseFloat(cleanValue);
    return isNaN(numericValue) ? 0 : numericValue;
}

// ============================================
// MAIN HANDLER
// ============================================
export async function handler(event, context) {
    debugLog('DEBUG', 'Request received', {
        method: event.httpMethod,
        path: event.path,
        bodyLength: event.body?.length
    });
    
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
    }

    const sql = neon();
    const authHeader = event.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Auth endpoints (no token required)
    if (event.httpMethod === 'POST') {
        if (!event.body) {
            debugLog('WARN', 'Request missing body');
            return { statusCode: 400, body: JSON.stringify({ error: 'No body' }) };
        }
        
        const body = JSON.parse(event.body);
        const { action, query, params, username, password, role, token: registerToken } = body;

        // Login action
        if (action === 'login') {
            try {
                debugLog('INFO', 'Login attempt', { username });
                
                const result = await sql.query(
                    'SELECT username, password, role FROM users WHERE username = $1',
                    [username]
                );
                
                if (result.rows.length === 0) {
                    debugLog('WARN', 'Login failed - user not found', { username });
                    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
                }
                
                const user = result.rows[0];
                const isPasswordValid = await verifyPassword(password, user.password);
                
                if (!isPasswordValid) {
                    debugLog('WARN', 'Login failed - invalid password', { username });
                    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
                }
                
                const authToken = createToken(user.username, user.role);
                
                debugLog('INFO', 'Login successful', { username: user.username, role: user.role });
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({
                        token: authToken,
                        username: user.username,
                        role: user.role
                    })
                };
            } catch (error) {
                debugLog('ERROR', 'Login error', { error: error.message, stack: error.stack });
                return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
            }
        }
        
        // Register action
        if (action === 'register') {
            try {
                debugLog('INFO', 'Registration attempt', { username });
                
                const hashedPassword = await hashPassword(password);
                const result = await sql.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING username, role',
                    [username, hashedPassword, role || 'spectator']
                );
                
                const user = result.rows[0];
                const authToken = createToken(user.username, user.role);
                
                debugLog('INFO', 'Registration successful', { username: user.username });
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({
                        token: authToken,
                        username: user.username,
                        role: user.role
                    })
                };
            } catch (error) {
                if (error.message.includes('duplicate key') || error.code === '23505') {
                    debugLog('WARN', 'Registration failed - user exists', { username });
                    return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
                }
                debugLog('ERROR', 'Registration error', { error: error.message });
                return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
            }
        }
        
        // Verify token action
        if (action === 'verify') {
            if (!registerToken) {
                debugLog('WARN', 'Verify missing token');
                return { statusCode: 400, body: JSON.stringify({ error: 'No token' }) };
            }
            
            const user = verifyToken(registerToken);
            if (!user) {
                debugLog('WARN', 'Verify invalid token');
                return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
            }
            
            debugLog('DEBUG', 'Token verified', { username: user.username });
            
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ username: user.username, role: user.role })
            };
        }

        // For other actions, require authentication
        let authenticatedUser = null;
        if (token) {
            authenticatedUser = verifyToken(token);
            if (!authenticatedUser) {
                debugLog('WARN', 'Unauthorized request');
                return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
            }
            debugLog('DEBUG', 'Authenticated request', { user: authenticatedUser.username });
        }

        // Execute SQL query
        if (query && query.trim() !== '') {
            try {
                debugLog('DEBUG', 'Executing query', { 
                    query: query.substring(0, 100), 
                    params: params?.length 
                });
                
                let result;
                if (params && params.length > 0) {
                    // Parse numeric params from Polish format
                    const parsedParams = params.map(p => parsePolishNumber(p));
                    result = await sql.query(query, parsedParams);
                } else {
                    result = await sql.query(query, []);
                }

                debugLog('DEBUG', 'Query successful', { rowCount: result.rowCount });
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify(result)
                };
            } catch (error) {
                debugLog('ERROR', 'Query error', { 
                    error: error.message, 
                    code: error.code,
                    query: query.substring(0, 50)
                });
                return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
            }
        }
    }

    debugLog('DEBUG', 'Health check endpoint');
    return { statusCode: 200, body: JSON.stringify({ ok: true, timestamp: new Date().toISOString() }) };
}