import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';
import updateManager from '../utils/serviceWorkerUpdate';

const UpdateNotification = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Set up update callbacks
    updateManager.setOnUpdateAvailable(() => {
      setShowUpdatePrompt(true);
    });

    updateManager.setOnUpdateReady(() => {
      // Update is ready, reload the page
      window.location.reload();
    });

    // Initialize the update manager
    updateManager.init();
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    updateManager.applyUpdate();
    // The page will reload automatically when update is ready
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };


  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white border border-primary-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Download className="w-5 h-5 text-primary-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              New Version Available!
            </h3>
            <p className="text-xs text-gray-600 mb-3">
              A new version of Jamā'ah Journal is ready. Update now to get the latest features and improvements.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Update Now
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
