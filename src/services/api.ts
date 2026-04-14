import type {
    Item,
    User,
    AuthResponse,
    HistoryEntry,
    DeviceNickname,
    UserDevice,
} from '../types';

const TOKEN_KEY = 'inventory_auth_token';
const USER_KEY = 'inventory_user';

function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

function setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
}

function removeUser(): void {
    localStorage.removeItem(USER_KEY);
}

async function neonQuery<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const functionUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV 
        ? 'http://localhost:8888/.netlify/functions/neon-proxy'
        : '/.netlify/functions/neon-proxy');

    const token = getToken();

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                query: sql,
                params: params
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Neon query failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.rows || data;
    } catch (error) {
        console.error('Neon query error:', error);
        throw error;
    }
}

export const api = {
    query: neonQuery,

    async loginUser(username: string, password: string): Promise<User | null> {
        const functionUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV 
            ? 'http://localhost:8888/.netlify/functions/neon-proxy'
            : '/.netlify/functions/neon-proxy');

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'login',
                    username,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.log('Login failed:', errorData);
                throw new Error(errorData.error || 'Login failed');
            }

            const data: AuthResponse = await response.json();
            
            if (data.token) {
                setToken(data.token);
                setUser({ username: data.username, role: data.role as User['role'] });
                return { username: data.username, role: data.role as User['role'] };
            }
            
            return null;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async registerUser(username: string, password: string, role: string = 'spectator'): Promise<User | null> {
        const functionUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV 
            ? 'http://localhost:8888/.netlify/functions/neon-proxy'
            : '/.netlify/functions/neon-proxy');
        
        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'register',
                    username,
                    password,
                    role
                })
            });

            const data: AuthResponse = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            if (data.token) {
                setToken(data.token);
                setUser({ username: data.username, role: data.role as User['role'] });
                return { username: data.username, role: data.role as User['role'] };
            }
            
            return null;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    async verifyToken(): Promise<User | null> {
        const token = getToken();
        if (!token) return null;

        const functionUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV 
            ? 'http://localhost:8888/.netlify/functions/neon-proxy'
            : '/.netlify/functions/neon-proxy');

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'verify',
                    token
                })
            });

            if (!response.ok) {
                this.logout();
                return null;
            }

            const data = await response.json();
            
            if (data.username) {
                const user = { username: data.username, role: data.role as User['role'] };
                setUser(user);
                return user;
            }
            
            return null;
        } catch {
            this.logout();
            return null;
        }
    },

    logout(): void {
        removeToken();
        removeUser();
    },

    getStoredUser(): User | null {
        return getUser();
    },

    async getItems(category: string | null = null): Promise<Item[]> {
        let query = 'SELECT * FROM items';
        if (category) {
            query += ' WHERE category = $1';
            return neonQuery<Item>(query, [category]);
        }
        return neonQuery<Item>(query);
    },

    async addItem(item: Item): Promise<Item[]> {
        const query = `
            INSERT INTO items (
                name, quantity, ilosc, description, photo_url, photo_url2, category,
                wysokosc, szerokosc, glebokosc, data_wyjazdu, stan, linknadysk,
                updatedAt, updatedBy, deviceId, stoisko
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING *
        `;
        
        const params = [
            item.name,
            item.quantity || '',
            item.ilosc || 0,
            item.description || '',
            item.photo_url || '',
            item.photo_url2 || '',
            item.category || 'NM',
            item.wysokosc || 0,
            item.szerokosc || 0,
            item.glebokosc || 0,
            item.data_wyjazdu || null,
            item.stan || 0,
            item.linknadysk || '',
            new Date().toISOString(),
            item.updatedBy || 'Unknown',
            item.deviceId || 'Unknown',
            item.stoisko || ''
        ];
        
        return neonQuery<Item>(query, params);
    },

    async updateItem(name: string, item: Item): Promise<Item[]> {
        const query = `
            UPDATE items SET
                quantity = $1,
                ilosc = $2,
                description = $3,
                photo_url = $4,
                photo_url2 = $5,
                category = $6,
                wysokosc = $7,
                szerokosc = $8,
                glebokosc = $9,
                data_wyjazdu = $10,
                stan = $11,
                linknadysk = $12,
                updatedAt = $13,
                updatedBy = $14,
                deviceId = $15,
                stoisko = $16
            WHERE name = $17 RETURNING *
        `;
        
        const params = [
            item.quantity || '',
            item.ilosc || 0,
            item.description || '',
            item.photo_url || '',
            item.photo_url2 || '',
            item.category || 'NM',
            item.wysokosc || 0,
            item.szerokosc || 0,
            item.glebokosc || 0,
            item.data_wyjazdu || null,
            item.stan || 0,
            item.linknadysk || '',
            new Date().toISOString(),
            item.updatedBy || 'Unknown',
            item.deviceId || 'Unknown',
            item.stoisko || '',
            name
        ];
        
        return neonQuery<Item>(query, params);
    },

    async deleteItem(name: string): Promise<Item[]> {
        const query = 'DELETE FROM items WHERE name = $1 RETURNING *';
        return neonQuery<Item>(query, [name]);
    },

    async getNextAvailableId(category: string, tvSize: string = '55'): Promise<string> {
        if (category === 'Telewizory') {
            const query = 'SELECT name FROM items WHERE category = $1 AND name LIKE $2 ORDER BY name';
            const result = await neonQuery<{ name: string }>(query, [category, `TV${tvSize}%`]);
            
            const usedNumbers = new Set<number>();
            
            result.forEach(item => {
                const match = item.name.match(new RegExp(`TV${tvSize}(\\d{3})`));
                if (match) {
                    const number = parseInt(match[1], 10);
                    usedNumbers.add(number);
                }
            });
            
            for (let nextNumber = 1; nextNumber <= 999; nextNumber++) {
                if (!usedNumbers.has(nextNumber)) {
                    return `TV${tvSize}${nextNumber.toString().padStart(3, '0')}`;
                }
            }
            
            throw new Error(`All IDs for TV size ${tvSize}" are taken. Try another size or contact admin.`);
        }
        
        const prefixMap: Record<string, string> = {
            'Lodowki': 'L',
            'Ekspresy': 'E',
            'Krzesla': 'K',
            'NM': 'NM',
            'LADY': 'A'
        };
        
        const prefix = prefixMap[category] || 'X';
        const query = 'SELECT name FROM items WHERE category = $1 AND name LIKE $2 ORDER BY name';
        const result = await neonQuery<{ name: string }>(query, [category, `${prefix}%`]);
        
        const usedNumbers = new Set<number>();
        result.forEach(item => {
            const match = item.name.match(new RegExp(`${prefix}(\d+)`));
            if (match) {
                usedNumbers.add(parseInt(match[1], 10));
            }
        });
        
        let nextNumber = 1;
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    },

    async addHistoryEntry(entry: Partial<HistoryEntry>): Promise<HistoryEntry[] | null> {
        const query = `
            INSERT INTO history (item_name, action, field_name, old_value, new_value, changed_by, device_id, timestamp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
            RETURNING *
        `;
        
        const params = [
            entry.item_name || '',
            entry.action || 'edit',
            entry.field_name || '',
            entry.old_value || '',
            entry.new_value || '',
            entry.changed_by || 'Unknown',
            entry.device_id || 'Unknown'
        ];
        
        try {
            return neonQuery<HistoryEntry>(query, params);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('History logging failed:', err.message);
            return null;
        }
    },

    async getHistory(itemName: string | null = null): Promise<HistoryEntry[]> {
        try {
            if (itemName && itemName.trim()) {
                const query = `SELECT * FROM history WHERE item_name = $1 ORDER BY timestamp DESC LIMIT 100`;
                const result = await neonQuery<HistoryEntry>(query, [itemName]);
                return result.map(r => ({ ...r, name: r.item_name }));
            } else {
                const query = `SELECT * FROM history ORDER BY timestamp DESC LIMIT 500`;
                const result = await neonQuery<HistoryEntry>(query);
                return result.map(r => ({ ...r, name: r.item_name }));
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('History query error:', err.message);
            return [];
        }
    },

    async clearHistory(): Promise<HistoryEntry[]> {
        const query = 'DELETE FROM history RETURNING *';
        try {
            return neonQuery<HistoryEntry>(query);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Could not clear history:', err.message);
            return [];
        }
    },

    async getUserDevices(): Promise<UserDevice[]> {
        const query = `SELECT DISTINCT changed_by, device_id FROM history ORDER BY changed_by, device_id`;
        try {
            return neonQuery<UserDevice>(query);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Get user devices error:', err.message);
            return [];
        }
    },

    async getUserDevicesByUser(username: string): Promise<{ device_id: string }[]> {
        const query = `SELECT DISTINCT device_id FROM history WHERE changed_by = $1`;
        try {
            return neonQuery<{ device_id: string }>(query, [username]);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Get user devices error:', err.message);
            return [];
        }
    },

    async getDeviceNicknames(): Promise<DeviceNickname[]> {
        const query = `SELECT username, device_id, nickname FROM device_nicknames`;
        try {
            return neonQuery<DeviceNickname>(query);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Get nicknames error:', err.message);
            return [];
        }
    },

    async saveDeviceNickname(username: string, deviceId: string, nickname: string): Promise<DeviceNickname[] | null> {
        const query = `
            INSERT INTO device_nicknames (username, device_id, nickname) 
            VALUES ($1, $2, $3)
            ON CONFLICT (username, device_id) 
            DO UPDATE SET nickname = $3
        `;
        try {
            return neonQuery<DeviceNickname>(query, [username, deviceId, nickname]);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Save nickname error:', err.message);
            return null;
        }
    },

    async deleteDeviceNickname(username: string, deviceId: string): Promise<DeviceNickname[] | null> {
        const query = `DELETE FROM device_nicknames WHERE username = $1 AND device_id = $2`;
        try {
            return neonQuery<DeviceNickname>(query, [username, deviceId]);
        } catch (error: unknown) {
            const err = error as Error;
            console.warn('Delete nickname error:', err.message);
            return null;
        }
    },

    // ===== USER ROLES =====
    async initUserRolesTable(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS user_roles (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(50) DEFAULT 'spectator',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        try {
            await neonQuery(query, []);
            console.log('user_roles table ready');
        } catch (e) {
            console.warn('user_roles table error:', e);
        }
    },

    async setUserRole(email: string, role: string): Promise<boolean> {
        await this.initUserRolesTable();
        const query = `
            INSERT INTO user_roles (email, role)
            VALUES ($1, $2)
            ON CONFLICT (email) DO UPDATE SET role = $2
        `;
        try {
            await neonQuery(query, [email.toLowerCase(), role]);
            console.log('Role set:', email, role);
            return true;
        } catch (e) {
            console.error('Set role error:', e);
            return false;
        }
    },

    async getUserRole(email: string): Promise<string> {
        await this.initUserRolesTable();
        const query = `SELECT role FROM user_roles WHERE email = $1`;
        try {
            const result = await neonQuery<{ role: string }>(query, [email.toLowerCase()]);
            return result[0]?.role || 'spectator';
        } catch (e) {
            console.warn('Get role error:', e);
            return 'spectator';
        }
    },

    async getAllUserRoles(): Promise<{ email: string; role: string }[]> {
        await this.initUserRolesTable();
        const query = `SELECT email, role FROM user_roles ORDER BY email`;
        try {
            return await neonQuery(query, []);
        } catch (e) {
            console.warn('Get all roles error:', e);
            return [];
        }
    },

    async deleteUserRole(email: string): Promise<boolean> {
        const query = `DELETE FROM user_roles WHERE email = $1`;
        try {
            await neonQuery(query, [email.toLowerCase()]);
            return true;
        } catch (e) {
            console.error('Delete role error:', e);
            return false;
        }
    },
};

export default api;