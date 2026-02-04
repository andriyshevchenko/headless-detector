import PropTypes from 'prop-types';

/**
 * Score card displaying the headless detection score
 */
export function ScoreCard({ score, status, label }) {
    return (
        <div className="score-card">
            <div className="score-label">Headless Detection Score</div>
            <div className="score-value">{score.toFixed(2)}</div>
            <div className={`status-badge status-${status}`}>{label}</div>
            <p style={{ marginTop: '15px', color: '#666', fontSize: '0.95rem' }}>
                Score ranges from 0.0 (normal browser) to 1.0 (definitely headless)
            </p>
        </div>
    );
}

ScoreCard.propTypes = {
    score: PropTypes.number.isRequired,
    status: PropTypes.oneOf(['normal', 'suspicious', 'headless']).isRequired,
    label: PropTypes.string.isRequired
};

export default ScoreCard;
