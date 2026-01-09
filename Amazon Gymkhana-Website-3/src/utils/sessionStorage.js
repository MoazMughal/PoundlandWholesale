// Session Storage Utility - Clears on browser close
// Use sessionStorage instead of localStorage for auto-logout on browser close

export const setSessionToken = (key, value) => {
  sessionStorage.setItem(key, value);
};

export const getSessionToken = (key) => {
  return sessionStorage.getItem(key);
};

export const removeSessionToken = (key) => {
  sessionStorage.removeItem(key);
};

export const clearAllSessions = () => {
  sessionStorage.clear();
};

// Check if user is logged in
export const isLoggedIn = (userType) => {
  const tokenKey = `${userType}Token`;
  return !!sessionStorage.getItem(tokenKey);
};

// Get user data
export const getUserData = (userType) => {
  const dataKey = `${userType}Data`;
  const data = sessionStorage.getItem(dataKey);
  return data ? JSON.parse(data) : null;
};

// Set user data
export const setUserData = (userType, data) => {
  const dataKey = `${userType}Data`;
  sessionStorage.setItem(dataKey, JSON.stringify(data));
};

// Logout user
export const logout = (userType) => {
  const tokenKey = `${userType}Token`;
  const dataKey = `${userType}Data`;
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(dataKey);
};

// Logout all users
export const logoutAll = () => {
  sessionStorage.clear();
  localStorage.clear(); // Also clear localStorage for complete cleanup
};

export default {
  setSessionToken,
  getSessionToken,
  removeSessionToken,
  clearAllSessions,
  isLoggedIn,
  getUserData,
  setUserData,
  logout,
  logoutAll
};
