/**
 * Unit tests for the Media module
 */

describe('Media Module', () => {
    let mediaModule;

    beforeAll(() => {
        // Load the media module
        mediaModule = require('../../scripts/modules/media');
    });

    describe('checkMediaDevices', () => {
        it('should return an object with available and suspicious properties', () => {
            const result = mediaModule.checkMediaDevices();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
            expect(result).toHaveProperty('suspicious');
        });

        it('should handle missing navigator.mediaDevices in Jest', () => {
            const result = mediaModule.checkMediaDevices();
            
            // In Jest environment, mediaDevices is typically undefined
            expect(result.available).toBe(false);
            expect(result.suspicious).toBe(true);
        });
    });

    describe('checkWebRTC', () => {
        it('should return an object with expected properties', () => {
            const result = mediaModule.checkWebRTC();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
            expect(result).toHaveProperty('suspicious');
        });

        it('should handle missing RTCPeerConnection in Jest', () => {
            const result = mediaModule.checkWebRTC();
            
            // In Jest environment, RTCPeerConnection is typically undefined
            expect(result.available).toBe(false);
        });
    });

    describe('checkBattery', () => {
        it('should return an object with available property', () => {
            const result = mediaModule.checkBattery();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
        });

        it('should detect when Battery API is unavailable', () => {
            const result = mediaModule.checkBattery();
            
            // In Jest environment, getBattery is typically unavailable
            expect(typeof result.available).toBe('boolean');
        });
    });

    describe('getMediaChecks', () => {
        it('should return aggregated media check results', () => {
            const result = mediaModule.getMediaChecks();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('mediaDevices');
            expect(result).toHaveProperty('webrtc');
            expect(result).toHaveProperty('battery');
        });

        it('should have consistent structure across all checks', () => {
            const result = mediaModule.getMediaChecks();
            
            // mediaDevices check - in Jest environment will be unavailable
            expect(typeof result.mediaDevices.available).toBe('boolean');
            expect(typeof result.mediaDevices.suspicious).toBe('boolean');
            
            // webrtc check
            expect(typeof result.webrtc.available).toBe('boolean');
            expect(typeof result.webrtc.suspicious).toBe('boolean');
            
            // battery check
            expect(typeof result.battery.available).toBe('boolean');
        });
    });

    describe('module exports', () => {
        it('should export all required functions', () => {
            expect(typeof mediaModule.checkMediaDevices).toBe('function');
            expect(typeof mediaModule.checkWebRTC).toBe('function');
            expect(typeof mediaModule.checkBattery).toBe('function');
            expect(typeof mediaModule.getMediaChecks).toBe('function');
        });
    });
});
