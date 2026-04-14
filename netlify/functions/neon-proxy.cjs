const crypto = require('crypto');

const APP_SECRET = process.env.APP_SECRET || 'testsecret123';
const TOKEN_EXPIRY_HOURS = 24;

function createToken(username, role) {
    const payload = { username, role, exp: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
}

function verifyToken(token) {
    try {
        const [encoded, signature] = token.split('.');
        const expectedSig = crypto.createHmac('sha256', APP_SECRET).update(encoded).digest('hex');
        if (signature !== expectedSig) return null;
        
        const payload = JSON.parse(Buffer.from(encoded, 'base64').toString());
        if (payload.exp < Date.now()) return null;
        
        return { username: payload.username, role: payload.role };
    } catch {
        return null;
    }
}

function simpleHash(password) {
    return password;
}

exports.handler = async function(event, context) {
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

    const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!dbUrl) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
    }
    
    let sql;
    try {
        const { neon } = require('@neondatabase/serverless');
        sql = neon(dbUrl);
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'SQL client error: ' + error.message }) };
    }
    
    const authHeader = event.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (event.httpMethod === 'POST') {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No body' }) };
        }
        
        const body = JSON.parse(event.body);
        const { action, query, params, username, password, role, token: registerToken } = body;

        if (action === 'login') {
            try {
                const searchName = username.trim();
                const result = await sql.query('SELECT id, username, role, password FROM users WHERE LOWER(username) = LOWER($1)', [searchName]);
                const rows = result?.rows;
                
                if (!rows || rows.length === 0) {
                    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
                }
                
                const user = rows[0];
                const simpleInputPassword = simpleHash(password);
                
                if (user.password !== simpleInputPassword) {
                    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
                }
                
                const authToken = createToken(user.username, user.role);
                return { 
                    statusCode: 200, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ token: authToken, username: user.username, role: user.role }) 
                };
            } catch (error) {
                return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
            }
        }
        
        if (action === 'register') {
            try {
                if (!username?.trim() || !password) {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required' }) };
                }
                
                const hashedPassword = simpleHash(password);
                
                await sql.query(`
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(255) UNIQUE NOT NULL,
                        password VARCHAR(255) NOT NULL,
                        role VARCHAR(50) DEFAULT 'spectator',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                const insertResult = await sql.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
                    [username.trim(), hashedPassword, role || 'spectator']
                );
                
                const user = insertResult && insertResult.rows ? insertResult.rows[0] : null;
                
                if (!user) {
                    return { statusCode: 500, body: JSON.stringify({ error: 'Registration failed - user not found' }) };
                }
                const authToken = createToken(user.username, user.role);
                return { 
                    statusCode: 200, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify({ token: authToken, username: user.username, role: user.role }) 
                };
            } catch (error) {
                if (error.code === '23505') {
                    return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
                }
                return { statusCode: 500, body: JSON.stringify({ error: error.message, code: error.code }) };
            }
        }
        
        if (action === 'verify') {
            if (!registerToken) {
                return { statusCode: 400, body: JSON.stringify({ error: 'No token' }) };
            }
            const user = verifyToken(registerToken);
            if (!user) {
                return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
            }
            return { 
                statusCode: 200, 
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                body: JSON.stringify({ username: user.username, role: user.role }) 
            };
        }

        if (token) {
            const user = verifyToken(token);
            if (!user) {
                return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
            }
        }

        if (query && query.trim() !== '') {
            try {
                const result = params && params.length > 0 
                    ? await sql.query(query, params) 
                    : await sql.query(query, []);
                return { 
                    statusCode: 200, 
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
                    body: JSON.stringify(result) 
                };
            } catch (error) {
                return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
            }
        }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};