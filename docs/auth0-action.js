// Auth0 Action для Login flow
// Добавляет роль из app_metadata в токен

exports.onExecuteLogin = async (event, api) => {
  // Читаем роль из app_metadata пользователя
  const role = event.user.app_metadata?.role || 'spectator';
  
  console.log('=== ACTION: User role from app_metadata:', role);
  
  // Добавляем в ID token
  api.idToken.setCustomClaim('https://inventory.com/role', role);
  
  // Добавляем в Access token
  api.accessToken.setCustomClaim('https://inventory.com/role', role);
};