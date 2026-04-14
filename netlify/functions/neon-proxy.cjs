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

function hashPassword(password) {
    return crypto.createHmac('sha256', APP_SECRET).update(password).digest('hex');
}

exports.handler = async function(event, context) {
  // Debug endpoint - returns APP_SECRET status
  if (event.httpMethod === 'GET') {
    return { 
      statusCode: 200, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, 
      body: JSON.stringify({ 
        APP_SECRET_set: !!APP_SECRET,
        APP_SECRET_length: APP_SECRET?.length,
        dbUrl_set: !!(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL)
      }) 
    };
  }
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } };
  }

  const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || 'postgresql://neondb_owner:npg_6raT2yGSzVEn@ep-restless-king-aesec10z-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
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
        console.log('=== LOGIN START ===');
        console.log('raw body:', JSON.stringify(body));
        console.log('username:', username);
        console.log('password:', password);
        console.log('password type:', typeof password);
        
        if (!username?.trim() || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required', debug: { username_received: !!username, password_received: !!password, password_value: password } }) };
        }
        
        const searchName = username.trim();
        
        // Use simple exact match first
        const result = await sql.query('SELECT id, username, role, password FROM users WHERE username = $1', [searchName]);
        
        let rows = result?.rows;
        
        if (!rows || rows.length === 0) {
            // Try case-insensitive
            const result2 = await sql.query('SELECT id, username, role, password FROM users WHERE LOWER(username) = LOWER($1)', [searchName]);
            
            if (!result2?.rows?.length) {
                // Get ALL users to see what's actually in DB
                const allUsers = await sql.query('SELECT * FROM users');
                console.log('=== ALL USERS IN DB ===');
                console.log('allUsers rows:', JSON.stringify(allUsers?.rows));
                
                return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials', debug: { no_user_found: true, all_users: allUsers?.rows } }) };
            }
            
            rows = result2.rows;
        }
        
        const user = rows[0];
        
        const hashedInputPassword = hashPassword(password);
        
        if (user.password !== hashedInputPassword) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
        }
        
        const authToken = createToken(user.username, user.role);
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ token: authToken, username: user.username, role: user.role }) };
      } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }
    }
    
    if (action === 'register') {
      try {
        if (!username?.trim() || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Username and password required' }) };
        }
        
        const hashedPassword = hashPassword(password);
        
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
        
        console.log('=== REGISTER INSERT RESULT ===');
        console.log('insertResult:', JSON.stringify(insertResult));
        
        // Force verify - query back the user we just inserted
        const verifyResult = await sql.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
        console.log('=== REGISTER VERIFY QUERY ===');
        console.log('verifyResult:', JSON.stringify(verifyResult));
        console.log('rows:', JSON.stringify(verifyResult?.rows));
        
        if (!verifyResult?.rows?.length) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Registration failed - user not found after insert', debug: { insertResult: insertResult?.rows } }) };
        }
        
        const storedUser = verifyResult.rows[0];
        
        console.log('=== STORED USER ===');
        console.log('storedUser:', JSON.stringify(storedUser));
        
        const debugInfo = {
          username: username.trim(),
          stored_password_hash: storedUser?.password || 'NOT FOUND',
          input_hashed: hashedPassword,
          stored_and_input_match: storedUser?.password === hashedPassword,
          role: storedUser?.role
        };
        
        console.log('=== REGISTER DEBUG INFO ===', JSON.stringify(debugInfo));
        
        const authToken = createToken(username.trim(), storedUser?.role || role || 'spectator');
        return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ token: authToken, username: username.trim(), role: storedUser?.role || role || 'spectator', debug: debugInfo }) };
      } catch (error) {
        if (error.code === '23505') return { statusCode: 400, body: JSON.stringify({ error: 'Username already exists' }) };
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
