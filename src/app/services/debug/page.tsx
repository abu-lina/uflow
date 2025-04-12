'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

export default function DebugServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        // Simple query without joins or filters
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        
        setServices(data || []);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchServices();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Services Debug Page</h1>
      
      {loading && <p>Loading services...</p>}
      
      {error && <p className="text-red-500">Error: {error}</p>}
      
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Services ({services.length}):</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(services, null, 2)}
        </pre>
      </div>
    </div>
  );
} 