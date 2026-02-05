import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Custom hook for behavior monitoring
 * Separates monitoring logic from UI components
 */
export function useBehaviorMonitor() {
    const [status, setStatus] = useState({
        isRunning: false,
        samples: {
            mouse: 0,
            keyboard: 0,
            scroll: 0,
            touch: 0,
            events: 0
        },
        elapsedTime: 0
    });
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [sessionEndTimestamp, setSessionEndTimestamp] = useState(null);
    
    const monitorRef = useRef(null);
    const elapsedIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    /**
     * Update sample counters from monitor status
     */
    const updateCounters = useCallback(() => {
        if (!monitorRef.current || typeof monitorRef.current.getStatus !== 'function') return;
        if (!isMountedRef.current) return;
        
        const monitorStatus = monitorRef.current.getStatus();
        if (!monitorStatus) return;
        
        setStatus(prev => ({
            ...prev,
            samples: monitorStatus.samples || prev.samples,
            elapsedTime: monitorStatus.elapsedTime || 0
        }));
    }, []);

    /**
     * Initialize the behavior monitor - memoized to prevent unnecessary re-creation
     */
    const initMonitor = useMemo(() => {
        return () => {
            try {
                if (typeof window.HeadlessBehaviorMonitor === 'undefined') {
                    throw new Error('HeadlessBehaviorMonitor class not found. Ensure behavior-monitor.js is loaded.');
                }
                monitorRef.current = new window.HeadlessBehaviorMonitor({
                    onSample: updateCounters
                });
                window.__behaviorMonitor = monitorRef.current;
                return true;
            } catch (err) {
                console.error('Failed to initialize HeadlessBehaviorMonitor:', err);
                setError(err.message);
                return false;
            }
        };
    }, [updateCounters]);

    /**
     * Start monitoring session
     */
    const startSession = useCallback(() => {
        // Clear any existing intervals - store reference to avoid race condition
        const existingIntervalId = elapsedIntervalRef.current;
        if (existingIntervalId !== null) {
            clearInterval(existingIntervalId);
            elapsedIntervalRef.current = null;
        }
        
        if (!monitorRef.current) {
            if (!initMonitor()) {
                return;
            }
        }
        
        monitorRef.current.start();
        setResults(null);
        setError(null);
        setSessionEndTimestamp(null);
        
        // Reset counters
        setStatus({
            isRunning: true,
            samples: {
                mouse: 0,
                keyboard: 0,
                scroll: 0,
                touch: 0,
                events: 0
            },
            elapsedTime: 0
        });
        
        // Start elapsed time counter
        elapsedIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                updateCounters();
            }
        }, 1000);
    }, [initMonitor, updateCounters]);

    /**
     * Stop monitoring session
     */
    const stopSession = useCallback(() => {
        if (!monitorRef.current) return;
        
        const monitorResults = monitorRef.current.stop();
        
        // Capture timestamp when session actually ends
        const endTimestamp = new Date();
        
        // Clear intervals
        if (elapsedIntervalRef.current) {
            clearInterval(elapsedIntervalRef.current);
            elapsedIntervalRef.current = null;
        }
        
        setStatus(prev => ({
            ...prev,
            isRunning: false
        }));
        
        if (monitorResults && isMountedRef.current) {
            setResults(monitorResults);
            setSessionEndTimestamp(endTimestamp);
        }
    }, []);

    /**
     * Format elapsed time as mm:ss
     */
    const formatElapsedTime = useCallback((ms) => {
        const elapsed = Math.floor((ms || 0) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Initialize on mount
    useEffect(() => {
        isMountedRef.current = true;
        
        const init = () => {
            if (isMountedRef.current) {
                initMonitor();
            }
        };

        // Use same pattern as useHeadlessDetection.js for consistency
        const readyState = document.readyState;
        if (readyState === 'complete' || readyState === 'interactive') {
            init();
        } else {
            document.addEventListener('DOMContentLoaded', init, { once: true });
        }
        
        return () => {
            isMountedRef.current = false;
            if (elapsedIntervalRef.current) {
                clearInterval(elapsedIntervalRef.current);
            }
        };
    }, [initMonitor]);

    return {
        status,
        results,
        error,
        sessionEndTimestamp,
        startSession,
        stopSession,
        formatElapsedTime
    };
}

/**
 * Hook for computing overall status based on behavior monitoring results
 */
export function useBehaviorStatus(results) {
    if (!results) return null;

    const score = results.overallScore || 0;
    const confidence = results.confidence || 0;
    
    let status = 'normal';
    let label = '✅ Human-like';
    
    if (score >= 0.6) {
        status = 'headless';
        label = '🚫 Bot-like';
    } else if (score >= 0.3) {
        status = 'suspicious';
        label = '⚠️ Suspicious';
    }

    return { status, label, score, confidence };
}

export default useBehaviorMonitor;
