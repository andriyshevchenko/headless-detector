/**
 * Jest setup file to mock canvas operations
 * This prevents "Not implemented: HTMLCanvasElement.prototype.getContext" errors
 */

// Mock HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    // Mock 2D context
    return {
      fillStyle: '',
      strokeStyle: '',
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      clearRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      measureText: jest.fn((text) => ({ width: 100 })),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      isPointInPath: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      transform: jest.fn(),
      bezierCurveTo: jest.fn(),
      arcTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      lineDashOffset: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      canvas: this
    };
  } else if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    // Mock WebGL context
    return {
      canvas: this,
      drawingBufferWidth: 300,
      drawingBufferHeight: 150,
      getContextAttributes: jest.fn(() => ({})),
      isContextLost: jest.fn(() => false),
      getSupportedExtensions: jest.fn(() => []),
      getExtension: jest.fn((name) => {
        if (name === 'WEBGL_debug_renderer_info') {
          return {
            UNMASKED_VENDOR_WEBGL: 0x9245,
            UNMASKED_RENDERER_WEBGL: 0x9246
          };
        }
        return null;
      }),
      getParameter: jest.fn((param) => {
        // Mock renderer info
        if (param === 0x9245) return 'Mock Vendor';
        if (param === 0x9246) return 'Mock Renderer';
        return null;
      }),
      clearColor: jest.fn(),
      clear: jest.fn(),
      viewport: jest.fn(),
      // Add other WebGL methods as needed
    };
  }
  
  return null;
};

// Mock canvas.toDataURL
HTMLCanvasElement.prototype.toDataURL = function(type) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};
