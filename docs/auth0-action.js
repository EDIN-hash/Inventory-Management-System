// Auth0 Action - добавить в Login flow
// Скопируй этот код в Actions Library

exports.onExecuteLogin = async (event, api) => {
  // Читаем роль из app_metadata
  const role = event.user.app_metadata?.role || 'spectator';
  
  // Добавляем роль в ID token
  api.idToken.setCustomClaim('https://inventory.com/role', role);
  
  // Добавляем роль в Access token  
  api.accessToken.setCustomClaim('https://inventory.com/role', role);
};