import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for headless browser detection
 * Separates detection logic from UI components
 */
export function useHeadlessDetection() {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMountedRef = useRef(true);

    const runDetection = useCallback(async () => {
        if (!isMountedRef.current) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Import and run detection
            if (window.detectHeadless) {
                const detectionResults = await window.detectHeadless(true);
                if (isMountedRef.current) {
                    setResults(detectionResults);
                }
            } else {
                throw new Error('Detection script not loaded');
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message);
                console.error('Detection failed:', err);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        // Reset mount state
        isMountedRef.current = true;
        
        // Run detection when component mounts, waiting for script readiness
        let cancelled = false;
        let timeoutId = null;
        const maxWaitMs = 2000;
        const pollIntervalMs = 50;
        const startTime = Date.now();

        const tryRunDetection = () => {
            if (cancelled || !isMountedRef.current) {
                return;
            }

            if (window.detectHeadless) {
                runDetection();
                return;
            }

            if (Date.now() - startTime >= maxWaitMs) {
                // Give up after max wait time
                if (isMountedRef.current) {
                    setError('Detection script not loaded');
                    setLoading(false);
                }
                return;
            }

            timeoutId = setTimeout(tryRunDetection, pollIntervalMs);
        };

        const onDomReady = () => {
            if (cancelled || !isMountedRef.current) {
                return;
            }
            tryRunDetection();
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            onDomReady();
        } else {
            document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
        }
        
        return () => {
            cancelled = true;
            isMountedRef.current = false;
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        };
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
