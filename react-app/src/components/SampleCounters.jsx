import PropTypes from 'prop-types';

// Extracted constant styles for better performance
const samplesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '15px',
    marginTop: '15px'
};

const sampleCounterStyle = {
    textAlign: 'center',
    padding: '15px',
    background: '#f9fafb',
    borderRadius: '10px'
};

const sampleValueStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#667eea'
};

const sampleLabelStyle = {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '5px'
};

/**
 * Live Sample Counters component
 */
export function SampleCounters({ samples }) {
    return (
        <div className="card">
            <div className="card-title">
                <span className="card-icon" aria-hidden="true">📊</span>
                Live Sample Counters
            </div>
            <div 
                className="samples-grid" 
                role="region" 
                aria-live="polite" 
                aria-label="Live sample counts"
                style={samplesGridStyle}
            >
                <SampleCounter icon="🖱️" label="Mouse" value={samples.mouse} />
                <SampleCounter icon="⌨️" label="Keyboard" value={samples.keyboard} />
                <SampleCounter icon="📜" label="Scroll" value={samples.scroll} />
                <SampleCounter icon="👆" label="Touch" value={samples.touch} />
                <SampleCounter icon="🎯" label="Events" value={samples.events} />
            </div>
        </div>
    );
}

SampleCounters.propTypes = {
    samples: PropTypes.shape({
        mouse: PropTypes.number.isRequired,
        keyboard: PropTypes.number.isRequired,
        scroll: PropTypes.number.isRequired,
        touch: PropTypes.number.isRequired,
        events: PropTypes.number.isRequired
    }).isRequired
};

/**
 * Individual sample counter
 */
function SampleCounter({ icon, label, value }) {
    return (
        <div className="sample-counter" style={sampleCounterStyle}>
            <div className="sample-value" style={sampleValueStyle}>
                {value || 0}
            </div>
            <div className="sample-label" style={sampleLabelStyle}>
                <span aria-hidden="true">{icon}</span> {label}
            </div>
        </div>
    );
}

SampleCounter.propTypes = {
    icon: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.number
};

export default SampleCounters;
