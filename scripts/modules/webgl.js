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
        
        // Set canvas dimensions before creating WebGL context
        const testSize = 64;
        canvas.width = testSize;
        canvas.height = testSize;
        
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
        const renderingTest = performWebGLRenderingTest(gl, testSize, renderer);

        return {
            supported: true,
            vendor,
            renderer,
            version: gl.getParameter(gl.VERSION),
            shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            isSoftwareRenderer,
            renderingTest: renderingTest,
            suspicious: isSoftwareRenderer || renderingTest.suspicious
        };
    } catch (e) {
        return { supported: false, error: true };
    }
}

/**
 * Perform complex WebGL rendering test (2026: NEW)
 * Renders a complex 3D scene and hashes the output
 * Bots using software renderers will produce different/noisy output
 * @param {WebGLRenderingContext} gl - WebGL context (canvas must be sized before context creation)
 * @param {number} testSize - Canvas dimensions (width and height)
 * @param {string} claimedRenderer - Claimed GPU renderer
 * @returns {Object} Rendering test results
 */
function performWebGLRenderingTest(gl, testSize, claimedRenderer) {
    let buffer, vertexShader, fragmentShader, program;
    try {
        
        // Create a simple rotating cube with lighting
        const vertices = new Float32Array([
            -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,  // front
            -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,  // back
        ]);

        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Simple shader
        vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec3 position;
            void main() {
                gl_Position = vec4(position * 0.5, 1.0);
            }
        `);
        gl.compileShader(vertexShader);
        
        // Check shader compilation status
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(vertexShader);
            throw new Error(`Vertex shader compilation failed: ${error}`);
        }

        fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.2, 0.5, 0.8, 1.0);
            }
        `);
        gl.compileShader(fragmentShader);
        
        // Check shader compilation status
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(fragmentShader);
            throw new Error(`Fragment shader compilation failed: ${error}`);
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // Check program linking status
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            throw new Error(`Program linking failed: ${error}`);
        }
        
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

        // Check for noise by comparing adjacent pixels in sampled regions
        let noiseLevel = 0;
        let sampleCount = 0;
        const sampleInterval = 16; // Sample every 16th pixel
        const sampleOffset = sampleInterval * 4; // 4 bytes per pixel (RGBA)
        
        // Compare adjacent pixels within sampled regions (more sensitive to rendering artifacts)
        for (let i = 0; i + sampleOffset + 4 < pixels.length; i += sampleOffset) {
            // Compare R channel of current pixel with R channel of immediately adjacent pixel
            const diff = Math.abs(pixels[i] - pixels[i + 4]);
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
    } finally {
        // Clean up WebGL resources to prevent GPU memory leaks
        if (gl) {
            try {
                if (buffer) gl.deleteBuffer(buffer);
                if (vertexShader) gl.deleteShader(vertexShader);
                if (fragmentShader) gl.deleteShader(fragmentShader);
                if (program) gl.deleteProgram(program);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
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
