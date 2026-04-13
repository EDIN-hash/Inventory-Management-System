const crypto = require('crypto');

const APP_SECRET = process.env.APP_SECRET;
const TOKEN_EXPIRY_HOURS = 24;

// Check secret at runtime inside handler
function checkSecret() {
    if (!APP_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: 'APP_SECRET not configured' }) };
    }
    return null;
}

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

function hashPassword(password) {
    return crypto.createHmac('sha256', APP_SECRET).update(password).digest('hex');
}

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } };
  }

  const secretError = checkSecret();
  if (secretError) return secretError;
  
  const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
  
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
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'No body' }) };
    
    const body = JSON.parse(event.body);
    const { action, query, params, username, password, role, token: registerToken } = body;

    if (action === 'login') {
      try {
        const hashedPassword = hashPassword(password);
        const result = await sql.query('SELECT username, role FROM users WHERE username = $1 AND password = $2', [username, hashedPassword]);
        
        const rows = result?.rows;
        if (!rows || rows.length === 0) {
            // Debug: return more info
            const allUsers = await sql.query('SELECT username, password FROM users LIMIT 5');
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials', debug: { inputHash: hashedPassword, sampleUsers: allUsers.rows } }) };
        }
        
        const user = rows[0];
        const authToken = createToken(user.username, user.role);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ token: authToken, username: user.username, role: user.role }) };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }
    }
    
    if (action === 'register') {
      try {
        const hashedPassword = hashPassword(password);
        
        // Use RETURNING to get user data in same query
        const result = await sql.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING username, role',
            [username, hashedPassword, role || 'spectator']
        );
        
        const rows = result?.rows;
        if (!rows || rows.length === 0) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create user' }) };
        
        const user = rows[0];
        const authToken = createToken(user.username, user.role);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ token: authToken, username: user.username, role: user.role }) };
      } catch (error) {
        if (error.message.includes('duplicate key') || error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
        return { statusCode: 500, body: JSON.stringify({ error: error.message, code: error.code }) };
      }
    }
    
    if (action === 'verify') {
      if (!registerToken) return { statusCode: 400, body: JSON.stringify({ error: 'No token' }) };
      const user = verifyToken(registerToken);
      if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ username: user.username, role: user.role }) };
    }

    if (token) {
        const user = verifyToken(token);
        if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    if (query && query.trim() !== '') {
      try {
        const result = params && params.length > 0 ? await sql.query(query, params) : await sql.query(query, []);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(result) };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
