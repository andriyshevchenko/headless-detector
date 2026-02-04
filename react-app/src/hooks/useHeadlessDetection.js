import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for headless browser detection
 * Separates detection logic from UI components
 */
export function useHeadlessDetection() {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const runDetection = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Import and run detection
            if (window.detectHeadless) {
                const detectionResults = await window.detectHeadless(true);
                setResults(detectionResults);
            } else {
                throw new Error('Detection script not loaded');
            }
        } catch (err) {
            setError(err.message);
            console.error('Detection failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Run detection when component mounts
        const timer = setTimeout(() => {
            runDetection();
        }, 100); // Small delay to ensure script is loaded
        
        return () => clearTimeout(timer);
    }, [runDetection]);

    return {
        results,
        loading,
        error,
        runDetection
    };
}

/**
 * Hook for computing status based on detection results
 */
export function useDetectionStatus(results) {
    if (!results) return null;

    const score = results.isHeadless;
    
    let status = 'normal';
    let label = '✅ Normal Browser';
    
    if (score >= 0.6) {
        status = 'headless';
        label = '🚫 Headless Detected';
    } else if (score >= 0.3) {
        status = 'suspicious';
        label = '⚠️ Suspicious Activity';
    }

    return { status, label, score };
}

export default useHeadlessDetection;
