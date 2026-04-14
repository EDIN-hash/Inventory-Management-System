// Auth0 Action - читает роль из Auth0 через Management API
// Добавить в Login flow

const axios = require('axios');

exports.onExecuteLogin = async (event, api) => {
  const userId = event.user.user_id;
  
  try {
    // Получаем пользователя через Management API
    const response = await axios.get(
      `https://${event.secrets.DOMAIN}/api/v2/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${event.secrets.VITE_AUTH0_MANAGEMENT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const user = response.data;
    const role = user.app_metadata?.role || 'spectator';
    
    console.log('=== ROLE FROM AUTH0 DB:', role, '===');
    
    // Добавляем роль в токены
    api.idToken.setCustomClaim('https://inventory.com/role', role);
    api.accessToken.setCustomClaim('https://inventory.com/role', role);
    
  } catch (error) {
    console.log('Error getting user:', error.message);
    // Fallback
    api.idToken.setCustomClaim('https://inventory.com/role', 'spectator');
    api.accessToken.setCustomClaim('https://inventory.com/role', 'spectator');
  }
};

// Для тестирования - добавляем в Secrets:
// DOMAIN = dev-ltz64nfoijkvemqi.us.auth0.com
// VITE_AUTH0_MANAGEMENT_TOKEN = <token>