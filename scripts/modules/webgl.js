/**
 * WebGL Detection Module
 * Checks WebGL renderer for software rendering indicators
 * @module modules/webgl
 */

// Import hash utility for Node.js environment
let simpleHash;
if (typeof require !== 'undefined') {
    try {
        simpleHash = require('../utils/hash.js').simpleHash;
    } catch (e) {
        // Fallback for browser environment
    }
}

// Browser environment fallback
if (typeof window !== 'undefined' && window.HeadlessDetectorUtils) {
    simpleHash = window.HeadlessDetectorUtils.simpleHash;
}

// Inline fallback if neither is available
if (!simpleHash) {
    simpleHash = function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    };
}

/**
 * Check WebGL renderer for software rendering (common in headless/VMs)
 * 2026 Update: Added complex rendering test to verify claimed GPU capabilities
 * @returns {Object} WebGL analysis results
 */
function checkWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return { supported: false };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

        const rendererLower = renderer.toLowerCase();
        const isSoftwareRenderer =
            rendererLower.includes('swiftshader') ||
            rendererLower.includes('llvmpipe') ||
            rendererLower.includes('softpipe') ||
            rendererLower.includes('virtualbox') ||
            rendererLower.includes('vmware') ||
            rendererLower.includes('mesa');

        // 2026: Perform complex rendering test to validate GPU consistency
        const renderingTest = performWebGLRenderingTest(gl, vendor, renderer);

        return {
            supported: true,
            vendor,
            renderer,
            version: gl.getParameter(gl.VERSION),
            shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            isSoftwareRenderer,
            renderingTest: renderingTest,
            suspicious: isSoftwareRenderer || Boolean(renderingTest && renderingTest.suspicious)
        };
    } catch (e) {
        return { supported: false, error: true };
    }
}

/**
 * Perform complex WebGL rendering test (2026: NEW)
 * Renders a complex 3D scene and hashes the output
 * Bots using software renderers will produce different/noisy output
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {string} claimedVendor - Claimed GPU vendor
 * @param {string} claimedRenderer - Claimed GPU renderer
 * @returns {Object} Rendering test results
 */
function performWebGLRenderingTest(gl, claimedVendor, claimedRenderer) {
    try {
        // Use a fixed small canvas size for consistent, fast testing
        const testSize = 64;
        
        // Create a simple rotating cube with lighting
        const vertices = new Float32Array([
            -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,  // front
            -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,  // back
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Simple shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec3 position;
            void main() {
                gl_Position = vec4(position * 0.5, 1.0);
            }
        `);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.2, 0.5, 0.8, 1.0);
            }
        `);
        gl.compileShader(fragmentShader);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

        // Set viewport to fixed size for consistent results
        gl.viewport(0, 0, testSize, testSize);
        
        // Clear and draw
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Read only the fixed test area (64x64 = 4096 pixels * 4 channels)
        const pixels = new Uint8Array(testSize * testSize * 4);
        gl.readPixels(0, 0, testSize, testSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const hash = simpleHash(Array.from(pixels.slice(0, 1000)).join(','));

        // Check for noise using sampling (check every 16th pixel for speed)
        let noiseLevel = 0;
        let sampleCount = 0;
        const sampleInterval = 16;
        for (let i = 0; i < pixels.length - sampleInterval * 4; i += sampleInterval * 4) {
            const diff = Math.abs(pixels[i] - pixels[i + sampleInterval * 4]);
            if (diff > 5) noiseLevel++;
            sampleCount++;
        }
        const noiseRatio = sampleCount > 0 ? noiseLevel / sampleCount : 0;

        // Check consistency with claimed GPU
        const isHighEndGPU = /nvidia|geforce|rtx|gtx|radeon|rx /i.test(claimedRenderer);
        const hasHighNoise = noiseRatio > 0.1;

        return {
            hash: hash,
            noiseRatio: noiseRatio.toFixed(4),
            suspicious: isHighEndGPU && hasHighNoise,
            reason: (isHighEndGPU && hasHighNoise) ?
                `High noise (${(noiseRatio * 100).toFixed(2)}%) inconsistent with claimed GPU: ${claimedRenderer}` :
                "Rendering appears consistent"
        };
    } catch (e) {
        return { suspicious: false, error: e.message };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkWebGL, performWebGLRenderingTest };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.checkWebGL = checkWebGL;
    window.HeadlessDetectorModules.performWebGLRenderingTest = performWebGLRenderingTest;
}
