import './App.css';
import { useHeadlessDetection, useDetectionStatus } from './hooks/useHeadlessDetection';
import { Header, Loading } from './components/Header';
import { ScoreCard } from './components/ScoreCard';
import {
    WebDriverCard,
    CDPCard,
    UserAgentCard,
    WebGLCard,
    WorkerCard,
    EmojiCard,
    DimensionsCard,
    BrowserAPIsCard,
    AutomationFlagsCard,
    AdvancedChecksCard,
    MediaCard,
    FingerprintCard,
    SystemInfoCard
} from './components/DetectionCards';
import { Metadata, AutomationTestingInfo } from './components/Metadata';

function App() {
    const { results, loading, error, runDetection } = useHeadlessDetection();
    const status = useDetectionStatus(results);

    return (
        <div className="container">
            <Header />
            
            {loading && <Loading />}
            
            {!loading && error && (
                <div className="error-container" style={{
                    background: '#fee2e2',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    padding: '20px',
                    margin: '20px 0',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
                    <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '10px' }}>
                        Detection Failed
                    </div>
                    <div style={{ color: '#7f1d1d', marginBottom: '15px' }}>
                        {error}
                    </div>
                    <button 
                        className="refresh-btn" 
                        onClick={runDetection}
                        style={{ margin: '0 auto' }}
                    >
                        🔄 Retry Detection
                    </button>
                </div>
            )}
            
            {!loading && !error && results && (
                <div id="results">
                    <ScoreCard 
                        score={status.score} 
                        status={status.status} 
                        label={status.label} 
                    />
                    
                    <div className="grid">
                        <WebDriverCard webdriver={results.webdriver} />
                        <CDPCard cdpArtifacts={results.cdpArtifacts} />
                        <UserAgentCard userAgentFlags={results.userAgentFlags} />
                        <WebGLCard webglFlags={results.webglFlags} />
                        <WorkerCard workerChecks={results.workerChecks} />
                        <EmojiCard fingerprintChecks={results.fingerprintChecks} />
                        <DimensionsCard headlessIndicators={results.headlessIndicators} />
                        <BrowserAPIsCard 
                            automationFlags={results.automationFlags} 
                            headlessIndicators={results.headlessIndicators} 
                        />
                        <AutomationFlagsCard automationFlags={results.automationFlags} />
                        <AdvancedChecksCard advancedChecks={results.advancedChecks} />
                        <MediaCard mediaChecks={results.mediaChecks} />
                        <FingerprintCard fingerprintChecks={results.fingerprintChecks} />
                        <SystemInfoCard headlessIndicators={results.headlessIndicators} />
                    </div>
                    
                    <Metadata results={results} />
                    
                    <button className="refresh-btn" onClick={runDetection}>
                        🔄 Run Detection Again
                    </button>
                    
                    <AutomationTestingInfo />
                </div>
            )}
        </div>
    );
}

export default App;
