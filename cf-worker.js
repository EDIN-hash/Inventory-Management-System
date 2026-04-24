// Cloudflare Worker for Neon Proxy
// Uses D1 or Neon database

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Add compatibility for Cloudflare Workers
export default {
    async fetch(request, env, ctx) {
        return await handle(request, env);
    }
};

const JWT_SECRET = env.JWT_SECRET || 'inventory-pwa-secret-key-change-in-production';
const TOKEN_EXPIRY_HOURS = 24;

// Try to load optional dependencies
let bcrypt, jwt;
try {
    bcrypt = require('bcryptjs');
    jwt = require('jsonwebtoken');
} catch (e) {
    console.log('Warning: bcryptjs/jsonwebtoken not available');
}

// Debug mode
const DEBUG_MODE = env.DEBUG === 'true';

function log(level, message, data = null) {
    if (DEBUG_MODE) {
        console.log(`[${level}] ${message}`, data || '');
    }
}

// Fallback password functions
async function hashPassword(password) {
    if (bcrypt) {
        return bcrypt.hash(password, 10);
    }
    return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

async function verifyPassword(password, hash) {
    if (bcrypt) {
        return bcrypt.compare(password, hash);
    }
    return hash === crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

function createToken(username, role) {
    if (jwt) {
        return jwt.sign({ username, role }, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRY_HOURS}h` });
    }
    const payload = { username, role, exp: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
}

function verifyToken(token) {
    if (jwt) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch { return null; }
    }
    try {
        const [encoded, signature] = token.split('.');
        const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('hex');
        if (signature !== expectedSig) return null;
        const payload = JSON.parse(Buffer.from(encoded, 'base64').toString());
        const parsed = JSON.parse(payload);
        if (parsed.exp < Date.now()) return null;
        return { username: parsed.username, role: parsed.role };
    } catch { return null; }
}

function parsePolishNumber(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleanValue = String(value)
        .replace(/\s/g, '')
        .replace(/\.(?=[^,]*?,)/g, '')
        .replace(',', '.');
    return parseFloat(cleanValue) || 0;
}

async function handle(event, env) {
    // Support both Cloudflare Request and Netlify-style event
    const request = event instanceof Request ? event : event;
    
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Get database (D1 or Neon)
    let sql = null;
    if (env.DB) {
        // D1 database
        sql = env.DB;
    } else if (env.DATABASE_URL) {
        // Neon from env
        sql = neon(env.DATABASE_URL);
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    try {
        const body = await request.json();
        const { action, query, params, username, password, role, token: registerToken } = body;

        // Login
        if (action === 'login') {
            if (!sql) return new Response(JSON.stringify({ error: 'No database' }), { status: 500 });
            
            const result = await sql.query(
                'SELECT username, password, role FROM users WHERE username = $1',
                [username]
            );
            
            if (result.rows?.length === 0) {
                return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                    status: 401, headers: corsHeaders 
                });
            }
            
            const user = result.rows[0];
            const isValid = await verifyPassword(password, user.password);
            
            if (!isValid) {
                return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                    status: 401, headers: corsHeaders 
                });
            }
            
            const authToken = createToken(user.username, user.role);
            
            return new Response(JSON.stringify({
                token: authToken,
                username: user.username,
                role: user.role
            }), { headers: corsHeaders });
        }

        // Register
        if (action === 'register') {
            if (!sql) return new Response(JSON.stringify({ error: 'No database' }), { status: 500 });
            
            const hashedPassword = await hashPassword(password);
            const result = await sql.query(
                'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING username, role',
                [username, hashedPassword, role || 'spectator']
            );
            
            const user = result.rows[0];
            const authToken = createToken(user.username, user.role);
            
            return new Response(JSON.stringify({
                token: authToken,
                username: user.username,
                role: user.role
            }), { headers: corsHeaders });
        }

        // Verify token
        if (action === 'verify') {
            const user = verifyToken(registerToken);
            if (!user) {
                return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                    status: 401, headers: corsHeaders 
                });
            }
            return new Response(JSON.stringify({ username: user.username, role: user.role }), { 
                headers: corsHeaders 
            });
        }

        // Auth required for other actions
        let authenticatedUser = null;
        if (token) {
            authenticatedUser = verifyToken(token);
            if (!authenticatedUser) {
                return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
                    status: 401, headers: corsHeaders 
                });
            }
        }

        // Execute SQL query
        if (query && query.trim() && sql) {
            let result;
            if (params?.length > 0) {
                const parsedParams = params.map(p => parsePolishNumber(p));
                result = await sql.query(query, parsedParams);
            } else {
                result = await sql.query(query, []);
            }

            return new Response(JSON.stringify(result), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        
    } catch (error) {
        log('ERROR', 'Request error', { error: error.message });
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, headers: corsHeaders 
        });
    }
}