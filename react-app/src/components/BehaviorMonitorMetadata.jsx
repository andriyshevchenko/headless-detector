import PropTypes from 'prop-types';

/**
 * Session Metadata component
 */
export function SessionMetadata({ results }) {
    if (!results || !results.metadata) return null;
    
    const { duration, samplesCollected } = results.metadata;
    
    // Format duration as mm:ss
    const formatDuration = () => {
        const durationMs = duration || 0;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    // Calculate total samples
    const totalSamples = samplesCollected 
        ? Object.values(samplesCollected).reduce((a, b) => a + b, 0)
        : 0;
    
    return (
        <div className="metadata">
            <div className="metadata-title">📋 Session Metadata</div>
            <MetadataItem label="Session Duration">
                {formatDuration()}
            </MetadataItem>
            <MetadataItem label="Total Samples">
                {totalSamples}
            </MetadataItem>
            <MetadataItem label="Timestamp">
                {new Date().toLocaleString()}
            </MetadataItem>
        </div>
    );
}

SessionMetadata.propTypes = {
    results: PropTypes.shape({
        metadata: PropTypes.shape({
            duration: PropTypes.number,
            samplesCollected: PropTypes.object
        })
    })
};

/**
 * Automation Testing Info component for API access documentation
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
            <MetadataItem label="Monitor Instance">
                <code style={codeStyle}>window.__behaviorMonitor</code>
            </MetadataItem>
            <MetadataItem label="Get Status">
                <code style={codeStyle}>window.__behaviorMonitor.getStatus()</code>
            </MetadataItem>
            <MetadataItem label="Get Results">
                <code style={codeStyle}>window.__behaviorMonitor.getResults()</code>
            </MetadataItem>
            <MetadataItem label="Start/Stop">
                <code style={codeStyle}>window.__behaviorMonitor.start() / .stop()</code>
            </MetadataItem>
        </div>
    );
}

/**
 * Individual metadata item
 */
function MetadataItem({ label, children }) {
    return (
        <div className="metadata-item">
            <span className="metadata-label">{label}:</span>
            <span className="metadata-value" style={{ marginLeft: '8px' }}>{children}</span>
        </div>
    );
}

MetadataItem.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node
};

const codeStyle = {
    background: '#fff', 
    padding: '2px 6px', 
    borderRadius: '4px'
};

export default SessionMetadata;
