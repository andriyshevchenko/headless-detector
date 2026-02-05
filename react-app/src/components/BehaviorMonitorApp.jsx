import '../App.css';
import { useBehaviorMonitor, useBehaviorStatus } from '../hooks/useBehaviorMonitor';
import { BehaviorMonitorHeader, SessionControls } from './BehaviorMonitorHeader';
import { SampleCounters } from './SampleCounters';
import { 
    OverallAnalysisCard,
    MouseAnalysisCard,
    KeyboardAnalysisCard,
    ScrollAnalysisCard,
    TouchAnalysisCard,
    EventsAnalysisCard,
    SensorAnalysisCard
} from './BehaviorAnalysisCards';
import { SessionMetadata, AutomationTestingInfo } from './BehaviorMonitorMetadata';

/**
 * CSS for pulse animation (inline keyframes aren't supported in React without CSS)
 */
const pulseKeyframes = `
@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
}
`;

function BehaviorMonitorApp() {
    const { 
        status, 
        results, 
        error, 
        sessionEndTimestamp,
        startSession, 
        stopSession, 
        formatElapsedTime 
    } = useBehaviorMonitor();
    
    const behaviorStatus = useBehaviorStatus(results);

    return (
        <div className="container">
            {/* Inject keyframes for pulse animation */}
            <style>{pulseKeyframes}</style>
            
            <BehaviorMonitorHeader />
            
            <SessionControls 
                isRunning={status.isRunning}
                elapsedTime={status.elapsedTime}
                onStart={startSession}
                onStop={stopSession}
                formatElapsedTime={formatElapsedTime}
                error={error}
            />
            
            <SampleCounters samples={status.samples} />
            
            {/* Analysis Results Grid - shown after session ends */}
            {results && behaviorStatus && (
                <>
                    <div 
                        className="grid" 
                        id="results-grid" 
                        style={{ marginTop: '20px' }}
                    >
                        <OverallAnalysisCard 
                            score={behaviorStatus.score}
                            confidence={behaviorStatus.confidence}
                            status={behaviorStatus.status}
                            label={behaviorStatus.label}
                        />
                        <MouseAnalysisCard analysis={results.mouse} />
                        <KeyboardAnalysisCard analysis={results.keyboard} />
                        <ScrollAnalysisCard analysis={results.scroll} />
                        <TouchAnalysisCard analysis={results.touch} />
                        <EventsAnalysisCard analysis={results.events} />
                        <SensorAnalysisCard sensors={results.sensors} />
                    </div>
                    
                    <SessionMetadata 
                        results={results} 
                        sessionEndTimestamp={sessionEndTimestamp} 
                    />
                </>
            )}
            
            <AutomationTestingInfo />
        </div>
    );
}

export default BehaviorMonitorApp;
