import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-12" role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600" aria-hidden="true"></div>
    </div>
  );
};

export default LoadingSpinner;