import PropTypes from 'prop-types';

/**
 * Behavior Monitor Header component
 */
export function BehaviorMonitorHeader() {
    return (
        <div className="header">
            <h1>🧠 Headless Behavior Monitor</h1>
            <p>Real-time behavioral analysis to detect bot-like interaction patterns</p>
            <a 
                href="index.html" 
                className="nav-link" 
                aria-label="Navigate back to Headless Browser Detector"
                style={{
                    display: 'inline-block',
                    color: 'white',
                    textDecoration: 'none',
                    marginTop: '10px',
                    opacity: 0.9,
                    transition: 'opacity 0.2s'
                }}
            >
                ← Back to Headless Detector
            </a>
        </div>
    );
}

/**
 * Session Controls component with Start/Stop buttons
 */
export function SessionControls({ 
    isRunning, 
    elapsedTime, 
    onStart, 
    onStop, 
    formatElapsedTime,
    error 
}) {
    return (
        <div className="score-card">
            <div className="score-label">Session Controls</div>
            
            <div className="btn-group" style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                margin: '20px 0'
            }}>
                <button 
                    className="session-btn primary"
                    onClick={onStart}
                    disabled={isRunning}
                    aria-label="Start behavior monitoring session"
                    style={sessionBtnStyle(isRunning, 'primary')}
                >
                    ▶️ Start Session
                </button>
                <button 
                    className="session-btn danger"
                    onClick={onStop}
                    disabled={!isRunning}
                    aria-label="End behavior monitoring session"
                    style={sessionBtnStyle(!isRunning, 'danger')}
                >
                    ⏹️ End Session
                </button>
            </div>
            
            <div className="session-status" style={{ textAlign: 'center', margin: '20px 0' }}>
                <StatusIndicator isRunning={isRunning} error={error} />
                <div 
                    className="elapsed-time" 
                    style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}
                    aria-live="off"
                >
                    {isRunning ? `Elapsed: ${formatElapsedTime(elapsedTime)}` : ''}
                </div>
            </div>
            
            <InstructionBox />
        </div>
    );
}

SessionControls.propTypes = {
    isRunning: PropTypes.bool.isRequired,
    elapsedTime: PropTypes.number.isRequired,
    onStart: PropTypes.func.isRequired,
    onStop: PropTypes.func.isRequired,
    formatElapsedTime: PropTypes.func.isRequired,
    error: PropTypes.string
};

/**
 * Status indicator showing session state
 */
function StatusIndicator({ isRunning, error }) {
    if (error) {
        return (
            <div 
                className="status-indicator" 
                role="status" 
                aria-live="polite"
                style={{
                    ...statusIndicatorBaseStyle,
                    background: '#fee2e2',
                    color: '#991b1b'
                }}
            >
                <span style={staticDotStyle} aria-hidden="true"></span>
                <span>Error: {error}</span>
            </div>
        );
    }

    return (
        <div 
            className={`status-indicator ${isRunning ? 'running' : 'stopped'}`}
            role="status" 
            aria-live="polite"
            style={{
                ...statusIndicatorBaseStyle,
                background: isRunning ? '#d1fae5' : '#f3f4f6',
                color: isRunning ? '#065f46' : '#6b7280'
            }}
        >
            <span 
                className={isRunning ? 'pulse-dot' : 'static-dot'} 
                style={isRunning ? pulseDotStyle : staticDotStyle}
                aria-hidden="true"
            ></span>
            <span>{isRunning ? 'Session Running' : 'Session Stopped'}</span>
        </div>
    );
}

StatusIndicator.propTypes = {
    isRunning: PropTypes.bool.isRequired,
    error: PropTypes.string
};

/**
 * Instruction box with usage instructions
 */
function InstructionBox() {
    return (
        <div className="instruction-box" style={{
            background: '#f0f4ff',
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '20px',
            margin: '20px 0',
            textAlign: 'center'
        }}>
            <div className="instruction-title" style={{
                color: '#667eea',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginBottom: '10px'
            }}>
                💡 How to Test
            </div>
            <div className="instruction-text" style={{ color: '#555', lineHeight: 1.6 }}>
                1. Click <strong>Start Session</strong> to begin monitoring<br />
                2. Move your mouse, type on keyboard, scroll the page<br />
                3. Click <strong>End Session</strong> to see analysis results<br />
                <em>The monitor needs enough samples to provide accurate analysis</em>
            </div>
        </div>
    );
}

// Styles
function sessionBtnStyle(disabled, type) {
    const baseStyle = {
        border: 'none',
        padding: '12px 30px',
        borderRadius: '25px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1
    };
    
    if (type === 'primary') {
        return {
            ...baseStyle,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
        };
    }
    
    return {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white'
    };
}

const statusIndicatorBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    borderRadius: '25px',
    fontWeight: 'bold',
    fontSize: '1.1rem'
};

const pulseDotStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#10b981',
    animation: 'pulse 1.5s infinite'
};

const staticDotStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#9ca3af'
};

export default BehaviorMonitorHeader;
