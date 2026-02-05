import PropTypes from 'prop-types';

// Extracted constant styles for better performance - moved outside component
const analysisRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #f0f0f0'
};

const analysisLabelStyle = { 
    fontWeight: 600, 
    color: '#333' 
};

const analysisSectionStyle = { 
    marginTop: '15px' 
};

const overallCenterStyle = { 
    textAlign: 'center', 
    padding: '20px 0' 
};

const confidenceContainerStyle = { 
    marginTop: '15px' 
};

const confidenceTextStyle = { 
    color: '#666' 
};

const confidenceValueStyle = { 
    fontWeight: 'bold', 
    marginLeft: '5px' 
};

const confidenceBarStyle = {
    width: '100px',
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
};

const confidenceFillBaseStyle = {
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s'
};

// Score style function moved outside component to prevent re-creation on every render
const scoreBaseStyle = {
    fontWeight: 'bold',
    padding: '4px 12px',
    borderRadius: '12px'
};

const scoreStyles = {
    'score-low': { ...scoreBaseStyle, background: '#d1fae5', color: '#065f46' },
    'score-medium': { ...scoreBaseStyle, background: '#fef3c7', color: '#92400e' },
    'score-high': { ...scoreBaseStyle, background: '#fee2e2', color: '#991b1b' },
    'default': scoreBaseStyle
};

function getScoreStyle(scoreClass) {
    return scoreStyles[scoreClass] || scoreStyles['default'];
}

/**
 * Helper function to get score CSS class
 */
function getScoreClass(score) {
    if (typeof score !== 'number') return '';
    if (score < 0.3) return 'score-low';
    if (score < 0.6) return 'score-medium';
    return 'score-high';
}

/**
 * Overall Analysis Card
 */
export function OverallAnalysisCard({ score, confidence, status, label }) {
    return (
        <div className="card">
            <div className="card-title">
                <span className="card-icon" aria-hidden="true">🎯</span>
                Overall Analysis
            </div>
            <div style={overallCenterStyle}>
                <div className="score-label">Bot Likelihood Score</div>
                <div className="score-value">{score.toFixed(2)}</div>
                <div className={`status-badge status-${status}`}>{label}</div>
                <div style={confidenceContainerStyle}>
                    <span style={confidenceTextStyle}>Confidence:</span>
                    <span style={confidenceValueStyle}>
                        {(confidence * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
}

OverallAnalysisCard.propTypes = {
    score: PropTypes.number.isRequired,
    confidence: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
};

/**
 * Generic Analysis Card for Mouse, Keyboard, Scroll, Touch, Events
 */
export function AnalysisCard({ 
    icon, 
    title, 
    analysis, 
    metrics 
}) {
    const { score, confidence, available } = analysis || {};
    const hasScore = typeof score === 'number';
    const sampleCount = metrics?.sampleCount || 0;
    const scoreClass = available && hasScore ? getScoreClass(score) : '';

    return (
        <div className="card">
            <div className="card-title">
                <span className="card-icon" aria-hidden="true">{icon}</span>
                {title}
            </div>
            <div className="analysis-section" style={analysisSectionStyle}>
                <AnalysisRow label="Bot Score">
                    <span 
                        className={`analysis-score ${scoreClass}`}
                        style={getScoreStyle(scoreClass)}
                    >
                        {available && hasScore ? score.toFixed(2) : 'N/A'}
                    </span>
                </AnalysisRow>
                <AnalysisRow label="Confidence">
                    <div className="confidence-bar" style={confidenceBarStyle}>
                        <div 
                            className="confidence-fill" 
                            style={{
                                ...confidenceFillBaseStyle,
                                width: `${((confidence || 0) * 100)}%`
                            }}
                        ></div>
                    </div>
                </AnalysisRow>
                <div className="check-item">
                    <span className="check-label">Samples</span>
                    <span className="check-value info">{sampleCount}</span>
                </div>
                {metrics && renderMetrics(metrics)}
            </div>
        </div>
    );
}

AnalysisCard.propTypes = {
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    analysis: PropTypes.shape({
        score: PropTypes.number,
        confidence: PropTypes.number,
        available: PropTypes.bool
    }),
    metrics: PropTypes.object
};

/**
 * Render additional metrics based on the type
 */
function renderMetrics(metrics) {
    const items = [];
    
    if (metrics.velocityVariance !== undefined) {
        items.push(
            <div key="velocity" className="check-item">
                <span className="check-label">Velocity Variance</span>
                <span className="check-value info">
                    {metrics.velocityVariance?.toFixed(2) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.angleVariance !== undefined) {
        items.push(
            <div key="angle" className="check-item">
                <span className="check-label">Angle Variance</span>
                <span className="check-value info">
                    {metrics.angleVariance?.toFixed(2) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.holdTimeVariance !== undefined) {
        items.push(
            <div key="holdtime" className="check-item">
                <span className="check-label">Hold Time Variance</span>
                <span className="check-value info">
                    {metrics.holdTimeVariance?.toFixed(2) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.interKeyVariance !== undefined) {
        items.push(
            <div key="interkey" className="check-item">
                <span className="check-label">Inter-Key Variance</span>
                <span className="check-value info">
                    {metrics.interKeyVariance?.toFixed(2) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.deltaVariance !== undefined) {
        items.push(
            <div key="delta" className="check-item">
                <span className="check-label">Delta Variance</span>
                <span className="check-value info">
                    {metrics.deltaVariance?.toFixed(2) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.forceVariance !== undefined) {
        items.push(
            <div key="force" className="check-item">
                <span className="check-label">Force Variance</span>
                <span className="check-value info">
                    {metrics.forceVariance?.toFixed(4) || '-'}
                </span>
            </div>
        );
    }
    
    if (metrics.untrustedRatio !== undefined) {
        items.push(
            <div key="untrusted" className="check-item">
                <span className="check-label">Untrusted Ratio</span>
                <span className="check-value info">
                    {`${(metrics.untrustedRatio * 100).toFixed(1)}%`}
                </span>
            </div>
        );
    }
    
    return items;
}

/**
 * Mouse Analysis Card
 */
export function MouseAnalysisCard({ analysis }) {
    return (
        <AnalysisCard 
            icon="🖱️"
            title="Mouse Movement Analysis"
            analysis={analysis}
            metrics={analysis?.metrics}
        />
    );
}

MouseAnalysisCard.propTypes = {
    analysis: PropTypes.object
};

/**
 * Keyboard Analysis Card
 */
export function KeyboardAnalysisCard({ analysis }) {
    return (
        <AnalysisCard 
            icon="⌨️"
            title="Keyboard Analysis"
            analysis={analysis}
            metrics={analysis?.metrics}
        />
    );
}

KeyboardAnalysisCard.propTypes = {
    analysis: PropTypes.object
};

/**
 * Scroll Analysis Card
 */
export function ScrollAnalysisCard({ analysis }) {
    return (
        <AnalysisCard 
            icon="📜"
            title="Scroll Analysis"
            analysis={analysis}
            metrics={analysis?.metrics}
        />
    );
}

ScrollAnalysisCard.propTypes = {
    analysis: PropTypes.object
};

/**
 * Touch Analysis Card
 */
export function TouchAnalysisCard({ analysis }) {
    return (
        <AnalysisCard 
            icon="👆"
            title="Touch Analysis"
            analysis={analysis}
            metrics={analysis?.metrics}
        />
    );
}

TouchAnalysisCard.propTypes = {
    analysis: PropTypes.object
};

/**
 * Events Analysis Card
 */
export function EventsAnalysisCard({ analysis }) {
    return (
        <AnalysisCard 
            icon="🎯"
            title="Events Analysis"
            analysis={analysis}
            metrics={analysis?.metrics}
        />
    );
}

EventsAnalysisCard.propTypes = {
    analysis: PropTypes.object
};

/**
 * Sensor Analysis Card
 */
export function SensorAnalysisCard({ sensors }) {
    const available = sensors?.available;
    const score = sensors?.score;
    const hasScore = typeof score === 'number';
    const scoreClass = available && hasScore ? getScoreClass(score) : '';

    return (
        <div className="card">
            <div className="card-title">
                <span className="card-icon" aria-hidden="true">📡</span>
                Sensor Analysis
            </div>
            <div className="analysis-section" style={analysisSectionStyle}>
                <AnalysisRow label="Bot Score">
                    <span 
                        className={`analysis-score ${scoreClass}`}
                        style={getScoreStyle(scoreClass)}
                    >
                        {available && hasScore ? score.toFixed(2) : 'N/A'}
                    </span>
                </AnalysisRow>
                <AnalysisRow label="Available">
                    <span className={`check-value ${available ? 'pass' : 'info'}`}>
                        {available ? 'YES' : 'NO'}
                    </span>
                </AnalysisRow>
            </div>
        </div>
    );
}

SensorAnalysisCard.propTypes = {
    sensors: PropTypes.shape({
        available: PropTypes.bool,
        score: PropTypes.number
    })
};

/**
 * Analysis Row helper component
 */
function AnalysisRow({ label, children }) {
    return (
        <div className="analysis-row" style={analysisRowStyle}>
            <span className="analysis-label" style={analysisLabelStyle}>
                {label}
            </span>
            {children}
        </div>
    );
}

AnalysisRow.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired
};

export default AnalysisCard;
