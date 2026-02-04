import PropTypes from 'prop-types';
import { DetectionCard, CheckItem, SignalList } from './DetectionCard';

/**
 * Helper function to get check status
 */
function getCheckStatus(value, invertLogic = false) {
    if (value === undefined || value === null) return 'info';
    if (typeof value === 'boolean') {
        const isGood = invertLogic ? value : !value;
        return isGood ? 'pass' : 'fail';
    }
    return 'info';
}

/**
 * Helper function to format check value
 */
function formatCheckValue(value) {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'YES' : 'NO';
    return String(value);
}

/**
 * WebDriver Detection Card
 */
export function WebDriverCard({ webdriver }) {
    return (
        <DetectionCard title="WebDriver Detection" icon="🤖">
            <CheckItem 
                label="WebDriver Present"
                value={formatCheckValue(webdriver)}
                status={getCheckStatus(webdriver)}
            />
        </DetectionCard>
    );
}

WebDriverCard.propTypes = {
    webdriver: PropTypes.bool
};

/**
 * CDP Artifacts Card
 */
export function CDPCard({ cdpArtifacts }) {
    if (!cdpArtifacts) return null;
    
    return (
        <DetectionCard title="CDP Artifacts" icon="🔧">
            <CheckItem 
                label="Detected"
                value={formatCheckValue(cdpArtifacts.detected)}
                status={getCheckStatus(cdpArtifacts.detected)}
            />
            <CheckItem 
                label="CDC Keys Found"
                value={cdpArtifacts.cdcKeysFound || 0}
                status="info"
            />
            <SignalList signals={cdpArtifacts.signals} />
        </DetectionCard>
    );
}

CDPCard.propTypes = {
    cdpArtifacts: PropTypes.shape({
        detected: PropTypes.bool,
        cdcKeysFound: PropTypes.number,
        signals: PropTypes.arrayOf(PropTypes.string)
    })
};

/**
 * User Agent Card
 */
export function UserAgentCard({ userAgentFlags }) {
    if (!userAgentFlags) return null;
    
    return (
        <DetectionCard title="User Agent" icon="📱">
            <CheckItem 
                label="Suspicious Patterns"
                value={formatCheckValue(userAgentFlags.suspicious)}
                status={getCheckStatus(userAgentFlags.suspicious)}
            />
            <SignalList signals={userAgentFlags.matches} />
        </DetectionCard>
    );
}

UserAgentCard.propTypes = {
    userAgentFlags: PropTypes.shape({
        suspicious: PropTypes.bool,
        matches: PropTypes.arrayOf(PropTypes.string)
    })
};

/**
 * WebGL Renderer Card
 */
export function WebGLCard({ webglFlags }) {
    if (!webglFlags) return null;
    
    const renderingTest = webglFlags.renderingTest;
    
    return (
        <DetectionCard title="WebGL Renderer" icon="🎨" badge="ENHANCED">
            <CheckItem 
                label="Supported"
                value={formatCheckValue(webglFlags.supported)}
                status={getCheckStatus(webglFlags.supported, true)}
            />
            <CheckItem 
                label="Software Renderer"
                value={formatCheckValue(webglFlags.isSoftwareRenderer)}
                status={getCheckStatus(webglFlags.isSoftwareRenderer)}
            />
            <CheckItem 
                label="Renderer"
                value={webglFlags.renderer ? webglFlags.renderer.substring(0, 30) : 'N/A'}
                status="info"
            />
            {renderingTest && (
                <>
                    <CheckItem 
                        label="Rendering Test"
                        value={formatCheckValue(renderingTest.suspicious)}
                        status={getCheckStatus(renderingTest.suspicious)}
                    />
                    <CheckItem 
                        label="Noise Ratio"
                        value={renderingTest.noiseRatio 
                            ? `${(parseFloat(renderingTest.noiseRatio) * 100).toFixed(2)}%` 
                            : 'N/A'}
                        status="info"
                    />
                </>
            )}
        </DetectionCard>
    );
}

WebGLCard.propTypes = {
    webglFlags: PropTypes.shape({
        supported: PropTypes.bool,
        isSoftwareRenderer: PropTypes.bool,
        renderer: PropTypes.string,
        renderingTest: PropTypes.shape({
            suspicious: PropTypes.bool,
            noiseRatio: PropTypes.string
        })
    })
};

/**
 * Worker UA Check Card (NEW 2026)
 */
export function WorkerCard({ workerChecks }) {
    if (!workerChecks) return null;
    
    return (
        <DetectionCard title="Worker UA Check" icon="🔧" badge="NEW 2026">
            <CheckItem 
                label="Available"
                value={formatCheckValue(workerChecks.available)}
                status={getCheckStatus(workerChecks.available, true)}
            />
            <CheckItem 
                label="UA Mismatch"
                value={formatCheckValue(workerChecks.userAgentMismatch)}
                status={getCheckStatus(workerChecks.userAgentMismatch)}
            />
            <CheckItem 
                label="Status"
                value={workerChecks.reason || workerChecks.status || 'N/A'}
                status="info"
            />
        </DetectionCard>
    );
}

WorkerCard.propTypes = {
    workerChecks: PropTypes.shape({
        available: PropTypes.bool,
        userAgentMismatch: PropTypes.bool,
        reason: PropTypes.string,
        status: PropTypes.string
    })
};

/**
 * Emoji OS Check Card (NEW 2026)
 */
export function EmojiCard({ fingerprintChecks }) {
    const emojiCheck = fingerprintChecks?.canvas?.emojiCheck;
    if (!emojiCheck) return null;
    
    return (
        <DetectionCard title="Emoji OS Check" icon="😀" badge="NEW 2026">
            <CheckItem 
                label="Rendered"
                value={formatCheckValue(emojiCheck.rendered)}
                status={getCheckStatus(emojiCheck.rendered, true)}
            />
            <CheckItem 
                label="Detected OS"
                value={emojiCheck.detectedOS || 'Unknown'}
                status="info"
            />
            <CheckItem 
                label="Suspicious"
                value={formatCheckValue(emojiCheck.suspicious)}
                status={getCheckStatus(emojiCheck.suspicious)}
            />
        </DetectionCard>
    );
}

EmojiCard.propTypes = {
    fingerprintChecks: PropTypes.shape({
        canvas: PropTypes.shape({
            emojiCheck: PropTypes.shape({
                rendered: PropTypes.bool,
                detectedOS: PropTypes.string,
                suspicious: PropTypes.bool
            })
        })
    })
};

/**
 * Window Dimensions Card
 */
export function DimensionsCard({ headlessIndicators }) {
    if (!headlessIndicators) return null;
    
    const hi = headlessIndicators;
    
    return (
        <DetectionCard title="Window Dimensions" icon="📐">
            <CheckItem 
                label="Has Outer Dimensions"
                value={formatCheckValue(hi.hasOuterDimensions)}
                status={getCheckStatus(hi.hasOuterDimensions, true)}
            />
            <CheckItem 
                label="Inner = Outer"
                value={formatCheckValue(hi.innerEqualsOuter)}
                status={getCheckStatus(hi.innerEqualsOuter)}
            />
            <CheckItem 
                label="Dimensions"
                value={`${hi.innerWidth}x${hi.innerHeight} / ${hi.outerWidth}x${hi.outerHeight}`}
                status="info"
            />
        </DetectionCard>
    );
}

DimensionsCard.propTypes = {
    headlessIndicators: PropTypes.shape({
        hasOuterDimensions: PropTypes.bool,
        innerEqualsOuter: PropTypes.bool,
        innerWidth: PropTypes.number,
        innerHeight: PropTypes.number,
        outerWidth: PropTypes.number,
        outerHeight: PropTypes.number
    })
};

/**
 * Browser APIs Card
 */
export function BrowserAPIsCard({ automationFlags, headlessIndicators }) {
    if (!automationFlags || !headlessIndicators) return null;
    
    const notifPerm = headlessIndicators.notificationPermission;
    const notifStatus = notifPerm === 'denied' ? 'warning' : 
                        notifPerm === 'granted' ? 'pass' : 'info';
    
    return (
        <DetectionCard title="Browser APIs" icon="🔌">
            <CheckItem 
                label="Plugins"
                value={automationFlags.plugins}
                status="info"
            />
            <CheckItem 
                label="Languages"
                value={formatCheckValue(automationFlags.languages)}
                status={getCheckStatus(automationFlags.languages, true)}
            />
            <CheckItem 
                label="Media Devices"
                value={formatCheckValue(headlessIndicators.hasMediaDevices)}
                status={getCheckStatus(headlessIndicators.hasMediaDevices, true)}
            />
            <CheckItem 
                label="Notifications"
                value={notifPerm || 'N/A'}
                status={notifStatus}
            />
        </DetectionCard>
    );
}

BrowserAPIsCard.propTypes = {
    automationFlags: PropTypes.shape({
        plugins: PropTypes.number,
        languages: PropTypes.bool
    }),
    headlessIndicators: PropTypes.shape({
        hasMediaDevices: PropTypes.bool,
        notificationPermission: PropTypes.string
    })
};

/**
 * Automation Flags Card
 */
export function AutomationFlagsCard({ automationFlags }) {
    if (!automationFlags) return null;
    
    const flagsToShow = [
        { key: 'domAutomation', label: 'domAutomation' },
        { key: '_selenium', label: '_selenium' },
        { key: '__webdriver_evaluate', label: '__webdriver_evaluate' },
        { key: '_phantom', label: '_phantom' },
        { key: '__nightmare', label: '__nightmare' },
        { key: 'callPhantom', label: 'callPhantom' }
    ];

    const playwrightFlags = [
        { key: '__playwright__binding__', label: '__playwright__binding__' },
        { key: '__pwInitScripts', label: '__pwInitScripts' }
    ];

    const pwFuncs = automationFlags.playwrightExposedFunctions;
    
    return (
        <DetectionCard title="Automation Flags" icon="🚨">
            {flagsToShow.map(flag => (
                <CheckItem 
                    key={flag.key}
                    label={flag.label}
                    value={formatCheckValue(automationFlags[flag.key])}
                    status={getCheckStatus(automationFlags[flag.key])}
                />
            ))}
            
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                <strong style={{ color: '#764ba2' }}>🎭 Playwright Detection</strong>
                <span className="new-badge" style={{ 
                    background: '#764ba2', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '10px', 
                    marginLeft: '5px' 
                }}>2026</span>
            </div>
            
            {playwrightFlags.map(flag => (
                <CheckItem 
                    key={flag.key}
                    label={flag.label}
                    value={formatCheckValue(automationFlags[flag.key])}
                    status={getCheckStatus(automationFlags[flag.key])}
                />
            ))}
            
            {pwFuncs && (
                <CheckItem 
                    label="Exposed Functions"
                    value={pwFuncs.detected ? `YES (${pwFuncs.count})` : 'NO'}
                    status={pwFuncs.detected ? 'fail' : 'pass'}
                />
            )}
            
            {pwFuncs?.functions?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    Functions: {pwFuncs.functions.join(', ')}
                </div>
            )}
        </DetectionCard>
    );
}

AutomationFlagsCard.propTypes = {
    automationFlags: PropTypes.object
};

/**
 * Advanced Checks Card
 */
export function AdvancedChecksCard({ advancedChecks }) {
    if (!advancedChecks) return null;
    
    return (
        <DetectionCard title="Advanced Checks" icon="🔬">
            <CheckItem 
                label="CDP Stack Trace"
                value={formatCheckValue(advancedChecks.stackTrace?.cdpDetected)}
                status={getCheckStatus(advancedChecks.stackTrace?.cdpDetected)}
            />
            <CheckItem 
                label="Chrome Runtime"
                value={advancedChecks.chromeRuntime?.missing === undefined ? 'N/A' : formatCheckValue(!advancedChecks.chromeRuntime.missing)}
                status={advancedChecks.chromeRuntime?.missing === undefined ? 'info' : getCheckStatus(!advancedChecks.chromeRuntime.missing, true)}
            />
            <CheckItem 
                label="Permissions API"
                value={advancedChecks.permissions?.deniedByDefault === undefined ? 'N/A' : formatCheckValue(!advancedChecks.permissions.deniedByDefault)}
                status={advancedChecks.permissions?.deniedByDefault === undefined ? 'info' : getCheckStatus(!advancedChecks.permissions.deniedByDefault, true)}
            />
            <CheckItem 
                label="Console Debug"
                value={formatCheckValue(advancedChecks.consoleDebug?.detected)}
                status={getCheckStatus(advancedChecks.consoleDebug?.detected)}
            />
        </DetectionCard>
    );
}

AdvancedChecksCard.propTypes = {
    advancedChecks: PropTypes.object
};

/**
 * Media & WebRTC Card
 */
export function MediaCard({ mediaChecks }) {
    if (!mediaChecks) return null;
    
    const webrtcSuspicious = mediaChecks.webrtc?.suspicious;
    
    return (
        <DetectionCard title="Media & WebRTC" icon="🎥">
            <CheckItem 
                label="WebRTC Available"
                value={webrtcSuspicious === undefined ? 'N/A' : formatCheckValue(!webrtcSuspicious)}
                status={webrtcSuspicious === undefined ? 'info' : getCheckStatus(!webrtcSuspicious, true)}
            />
            <CheckItem 
                label="Media Devices API"
                value={formatCheckValue(mediaChecks.mediaDevices?.available)}
                status={getCheckStatus(mediaChecks.mediaDevices?.available, true)}
            />
            <CheckItem 
                label="Battery API"
                value={formatCheckValue(mediaChecks.battery?.available)}
                status={getCheckStatus(mediaChecks.battery?.available, true)}
            />
        </DetectionCard>
    );
}

MediaCard.propTypes = {
    mediaChecks: PropTypes.object
};

/**
 * Fingerprinting Card
 */
export function FingerprintCard({ fingerprintChecks }) {
    if (!fingerprintChecks) return null;
    
    const fp = fingerprintChecks;
    
    return (
        <DetectionCard title="Fingerprinting" icon="🖌️">
            <CheckItem 
                label="Canvas Available"
                value={formatCheckValue(fp.canvas?.available)}
                status={getCheckStatus(fp.canvas?.available, true)}
            />
            <CheckItem 
                label="Audio Context"
                value={formatCheckValue(fp.audioContext?.available)}
                status={getCheckStatus(fp.audioContext?.available, true)}
            />
            <CheckItem 
                label="Fonts Detected"
                value={fp.fonts 
                    ? `${fp.fonts.detectedCount}/${fp.fonts.totalTested}` 
                    : 'N/A'}
                status="info"
            />
        </DetectionCard>
    );
}

FingerprintCard.propTypes = {
    fingerprintChecks: PropTypes.object
};

/**
 * System Info Card
 */
export function SystemInfoCard({ headlessIndicators }) {
    if (!headlessIndicators) return null;
    
    const hi = headlessIndicators;
    
    return (
        <DetectionCard title="System Info" icon="💻">
            <CheckItem 
                label="Platform"
                value={hi.platform || 'N/A'}
                status="info"
            />
            <CheckItem 
                label="CPU Cores"
                value={hi.hardwareConcurrency || 'N/A'}
                status="info"
            />
            <CheckItem 
                label="Device Memory"
                value={hi.deviceMemory ? `${hi.deviceMemory} GB` : 'N/A'}
                status="info"
            />
            <CheckItem 
                label="Touch Points"
                value={hi.maxTouchPoints}
                status="info"
            />
        </DetectionCard>
    );
}

SystemInfoCard.propTypes = {
    headlessIndicators: PropTypes.object
};
