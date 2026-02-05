/**
 * Header component displaying the title and description
 */
export function Header() {
    return (
        <div className="header">
            <h1>🕵️ Headless Browser Detector</h1>
            <p>Real-time detection of automation frameworks and headless browsers</p>
            <a 
                href="behavior-monitor.html" 
                aria-label="Navigate to Behavior Monitor test page" 
                style={{
                    display: 'inline-block',
                    color: 'white',
                    textDecoration: 'none',
                    marginTop: '10px',
                    opacity: 0.9,
                    transition: 'opacity 0.2s'
                }}
            >
                🧠 Try Behavior Monitor →
            </a>
        </div>
    );
}

/**
 * Loading component shown while detection is running
 */
export function Loading() {
    return (
        <div className="loading">
            <div>🔍 Analyzing browser environment...</div>
        </div>
    );
}

export default Header;
