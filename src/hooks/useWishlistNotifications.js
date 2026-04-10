import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/api';

/**
 * Polls for unread wishlist/query notification counts.
 * userType: 'buyer' | 'seller'
 * tokenKey: localStorage key for the auth token
 */
const useWishlistNotifications = (userType, tokenKey, isLoggedIn) => {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!isLoggedIn) { setCount(0); return; }
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    try {
      const endpoint = userType === 'buyer'
        ? 'wishlist/buyer/unread-count'
        : 'wishlist/seller/unread-count';
      const res = await fetch(getApiUrl(endpoint), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count || 0);
      }
    } catch (_) {}
  }, [isLoggedIn, userType, tokenKey]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const markSeen = useCallback(async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    try {
      const endpoint = userType === 'buyer'
        ? 'wishlist/buyer/mark-seen'
        : 'wishlist/seller/mark-seen';
      await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setCount(0);
    } catch (_) {}
  }, [userType, tokenKey]);

  return { count, markSeen, refresh: fetchCount };
};

export default useWishlistNotifications;
