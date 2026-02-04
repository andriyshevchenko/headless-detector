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
        // Run detection when component mounts, waiting for script readiness
        let cancelled = false;
        const maxWaitMs = 2000;
        const pollIntervalMs = 50;
        const startTime = Date.now();

        const tryRunDetection = () => {
            if (cancelled) {
                return;
            }

            if (window.detectHeadless) {
                runDetection();
                return;
            }

            if (Date.now() - startTime >= maxWaitMs) {
                // Give up after max wait time
                setError('Detection script not loaded');
                setLoading(false);
                return;
            }

            setTimeout(tryRunDetection, pollIntervalMs);
        };

        const onDomReady = () => {
            if (cancelled) {
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
