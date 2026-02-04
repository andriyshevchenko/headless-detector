import PropTypes from 'prop-types';

/**
 * Header component displaying the title and description
 */
export function Header() {
    return (
        <div className="header">
            <h1>🕵️ Headless Browser Detector</h1>
            <p>Real-time detection of automation frameworks and headless browsers</p>
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

Loading.propTypes = {};

export default Header;
