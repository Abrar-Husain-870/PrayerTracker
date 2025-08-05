import React, { useState } from 'react';
import { RefreshCw, Smartphone } from 'lucide-react';
import updateManager from '../utils/serviceWorkerUpdate';

const RefreshAppButton = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Force refresh the app
      await updateManager.forceRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-3">
        <Smartphone className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-800">App Updates</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        If you're experiencing issues or not seeing the latest features, you can manually refresh the app to get the newest version.
      </p>
      
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing App...' : 'Refresh App'}
      </button>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        This will clear cache and reload the app with the latest version
      </p>
    </div>
  );
};

export default RefreshAppButton;
