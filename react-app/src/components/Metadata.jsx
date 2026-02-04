import PropTypes from 'prop-types';

/**
 * Metadata section displaying session information
 */
export function Metadata({ results }) {
    if (!results) return null;
    
    const hi = results.headlessIndicators || {};
    
    // Helper function to safely format timezone
    const formatTimezone = () => {
        if (!hi.timezone || typeof hi.timezoneOffset !== 'number' || !isFinite(hi.timezoneOffset)) {
            return 'N/A';
        }
        return `${hi.timezone} (UTC${hi.timezoneOffset > 0 ? '-' : '+'}${Math.abs(hi.timezoneOffset/60)})`;
    };

    // Helper function to safely format screen resolution
    const formatScreenResolution = () => {
        if (typeof hi.screenWidth !== 'number' || typeof hi.screenHeight !== 'number' || 
            !isFinite(hi.screenWidth) || !isFinite(hi.screenHeight)) {
            return 'N/A';
        }
        const dpr = typeof hi.devicePixelRatio === 'number' && isFinite(hi.devicePixelRatio) 
            ? hi.devicePixelRatio 
            : 1;
        return `${hi.screenWidth}x${hi.screenHeight} @ ${dpr}x`;
    };
    
    return (
        <div className="metadata">
            <div className="metadata-title">📋 Session Metadata</div>
            <MetadataItem label="Timestamp">
                {new Date(results.timestamp).toLocaleString()}
            </MetadataItem>
            <MetadataItem label="User Agent">
                {results.userAgent}
            </MetadataItem>
            <MetadataItem label="Timezone">
                {formatTimezone()}
            </MetadataItem>
            <MetadataItem label="Screen Resolution">
                {formatScreenResolution()}
            </MetadataItem>
        </div>
    );
}

Metadata.propTypes = {
    results: PropTypes.shape({
        timestamp: PropTypes.number,
        userAgent: PropTypes.string,
        headlessIndicators: PropTypes.shape({
            timezone: PropTypes.string,
            timezoneOffset: PropTypes.number,
            screenWidth: PropTypes.number,
            screenHeight: PropTypes.number,
            devicePixelRatio: PropTypes.number
        })
    })
};

/**
 * Individual metadata item
 */
function MetadataItem({ label, children }) {
    return (
        <div className="metadata-item">
            <span className="metadata-label">{label}:</span>
            <span className="metadata-value">{children}</span>
        </div>
    );
}

MetadataItem.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node
};

/**
 * Automation Testing Info section
 */
export function AutomationTestingInfo() {
    return (
        <div className="metadata" style={{ 
            marginTop: '20px', 
            background: '#f0f4ff', 
            border: '2px solid #667eea' 
        }}>
            <div className="metadata-title" style={{ color: '#667eea' }}>
                🤖 Automation Testing Access
            </div>
            <MetadataItem label="Global Object">
                <code style={codeStyle}>window.__headlessDetection</code>
            </MetadataItem>
            <MetadataItem label="Score Access">
                <code style={codeStyle}>window.__headlessDetectionScore</code>
            </MetadataItem>
            <MetadataItem label="DOM Attribute">
                <code style={codeStyle}>document.documentElement.getAttribute(&apos;data-headless-score&apos;)</code>
            </MetadataItem>
            <MetadataItem label="Individual Checks">
                <code style={codeStyle}>window.HeadlessDetector.checks.*</code>
            </MetadataItem>
        </div>
    );
}

const codeStyle = {
    background: '#fff', 
    padding: '2px 6px', 
    borderRadius: '4px'
};

export default Metadata;
