import { useState, useEffect } from 'react';
import { healthService } from '../services/healthService';

export const useHealth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthService.checkHealth();
      setData(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  return { data, loading, error, refetch: check };
};
