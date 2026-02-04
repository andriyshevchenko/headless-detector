/**
 * Unit tests for the Fingerprint module
 */

describe('Fingerprint Module', () => {
    let fingerprintModule;

    beforeAll(() => {
        // Load the fingerprint module
        fingerprintModule = require('../../scripts/modules/fingerprint');
    });

    describe('checkCanvas', () => {
        it('should return an object with expected properties', () => {
            const result = fingerprintModule.checkCanvas();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
        });

        it('should include hash property when canvas is available', () => {
            const result = fingerprintModule.checkCanvas();
            
            // In Jest with jsdom-canvas-mock, canvas is available
            if (result.available) {
                expect(result).toHaveProperty('hash');
                expect(typeof result.hash).toBe('string');
            }
        });

        it('should return hex format hash for legacy compatibility', () => {
            const result = fingerprintModule.checkCanvas();
            
            if (result.available && result.hash) {
                // Hash should be hex format (base-16)
                expect(result.hash).toMatch(/^[0-9a-f]+$/i);
            }
        });
    });

    describe('checkEmojiRendering', () => {
        it('should return an object with expected properties', () => {
            const result = fingerprintModule.checkEmojiRendering();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('suspicious');
        });

        it('should always include rendered property in all return paths', () => {
            const result = fingerprintModule.checkEmojiRendering();
            
            // The rendered property should always be present (either true or false)
            expect(result).toHaveProperty('rendered');
            expect(typeof result.rendered).toBe('boolean');
        });

        it('should include detectedOS when emoji renders', () => {
            const result = fingerprintModule.checkEmojiRendering();
            
            if (result.rendered === true) {
                expect(result).toHaveProperty('detectedOS');
                expect(typeof result.detectedOS).toBe('string');
            }
        });

        it('should detect common operating systems from User-Agent', () => {
            const result = fingerprintModule.checkEmojiRendering();
            
            if (result.rendered && result.detectedOS) {
                const validOS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Unknown', 'none'];
                expect(validOS).toContain(result.detectedOS);
            }
        });
    });

    describe('checkAudioContext', () => {
        it('should return an object with available property', () => {
            const result = fingerprintModule.checkAudioContext();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
            expect(typeof result.available).toBe('boolean');
        });
    });

    describe('checkFonts', () => {
        it('should return an object with available property', () => {
            const result = fingerprintModule.checkFonts();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('available');
        });

        it('should return detectedCount when available', () => {
            const result = fingerprintModule.checkFonts();
            
            if (result.available) {
                expect(result).toHaveProperty('detectedCount');
                expect(typeof result.detectedCount).toBe('number');
                expect(result.detectedCount).toBeGreaterThanOrEqual(0);
            }
        });

        it('should return totalTested when available', () => {
            const result = fingerprintModule.checkFonts();
            
            if (result.available) {
                expect(result).toHaveProperty('totalTested');
                expect(typeof result.totalTested).toBe('number');
            }
        });
    });

    describe('getFingerprintChecks', () => {
        it('should return aggregated fingerprint check results', () => {
            const result = fingerprintModule.getFingerprintChecks();
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('canvas');
            expect(result).toHaveProperty('audioContext');
            expect(result).toHaveProperty('fonts');
        });

        it('should have consistent structure across all checks', () => {
            const result = fingerprintModule.getFingerprintChecks();
            
            // canvas check
            expect(typeof result.canvas.available).toBe('boolean');
            
            // audioContext check
            expect(typeof result.audioContext.available).toBe('boolean');
            
            // fonts check
            expect(typeof result.fonts.available).toBe('boolean');
        });
    });

    describe('module exports', () => {
        it('should export all required functions', () => {
            expect(typeof fingerprintModule.checkCanvas).toBe('function');
            expect(typeof fingerprintModule.checkEmojiRendering).toBe('function');
            expect(typeof fingerprintModule.checkAudioContext).toBe('function');
            expect(typeof fingerprintModule.checkFonts).toBe('function');
            expect(typeof fingerprintModule.getFingerprintChecks).toBe('function');
        });
    });

    describe('error handling', () => {
        it('should handle errors gracefully in checkEmojiRendering', () => {
            // The function should not throw even if canvas operations fail
            expect(() => {
                fingerprintModule.checkEmojiRendering();
            }).not.toThrow();
        });

        it('should handle errors gracefully in checkCanvas', () => {
            expect(() => {
                fingerprintModule.checkCanvas();
            }).not.toThrow();
        });
    });
});
