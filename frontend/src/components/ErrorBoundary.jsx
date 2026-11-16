import React from 'react';

/**
 * ErrorBoundary
 * Catches runtime React render exceptions and dynamic import (chunk load) failures.
 * Automatically recovers from version deployment mismatches with a controlled single reload.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error / Dynamic Import Failure:', error, errorInfo);
    
    // Check if error is caused by missing chunk after a deployment
    const isChunkError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError && typeof window !== 'undefined') {
      const alreadyRetried = sessionStorage.getItem('gkp_chunk_retry');
      if (!alreadyRetried) {
        sessionStorage.setItem('gkp_chunk_retry', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('gkp_chunk_retry');
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}
