import PropTypes from 'prop-types';

/**
 * Generic detection card component
 */
export function DetectionCard({ title, icon, badge, children }) {
    return (
        <div className="card">
            <div className="card-title">
                <span className="card-icon">{icon}</span>
                {title}
                {badge && <span className="new-badge">{badge}</span>}
            </div>
            {children}
        </div>
    );
}

DetectionCard.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    badge: PropTypes.string,
    children: PropTypes.node
};

/**
 * Check item row within a detection card
 */
export function CheckItem({ label, value, status = 'info' }) {
    return (
        <div className="check-item">
            <span className="check-label">{label}</span>
            <span className={`check-value ${status}`}>{value}</span>
        </div>
    );
}

CheckItem.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    status: PropTypes.oneOf(['pass', 'fail', 'warning', 'info'])
};

/**
 * Signal list showing detected signals
 */
export function SignalList({ signals }) {
    if (!signals || signals.length === 0) return null;
    
    return (
        <div className="signal-list">
            {signals.map((signal, index) => (
                <span key={index} className="signal-item">{signal}</span>
            ))}
        </div>
    );
}

SignalList.propTypes = {
    signals: PropTypes.arrayOf(PropTypes.string)
};

export default DetectionCard;
