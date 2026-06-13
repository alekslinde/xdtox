// Mock data injector for taking screenshots
// Inject mock scan results into the UI for demo/screenshot purposes

const mockFrames = [
  { id: 'frame-1', name: 'Hero Section' },
  { id: 'frame-2', name: 'Product Card' },
  { id: 'frame-3', name: 'Navigation Bar' },
  { id: 'frame-4', name: 'Footer Content' },
  { id: 'frame-5', name: 'Modal Dialog' },
];

function injectMockScanResult() {
  const mockResult = {
    type: 'scan-result',
    count: mockFrames.length,
    mode: 'page',
    frames: mockFrames,
  };

  // Simulate the message that comes from the plugin
  window.postMessage({
    pluginMessage: mockResult,
  }, '*');
}

function injectMockScanning() {
  // Show scanning view
  window.postMessage({ pluginMessage: { type: 'scan-start', total: 42 } }, '*');

  // Simulate progress updates
  let index = 0;
  const nodeNames = [
    'Board',
    'Section',
    'Header Group',
    'Card A',
    'Card B',
    'Card C',
    'Item 1',
    'Item 2',
    'Footer',
    'Sidebar',
  ];

  const interval = setInterval(() => {
    const nodeName = nodeNames[Math.floor(Math.random() * nodeNames.length)];
    const hit = Math.random() > 0.7;
    const found = Math.floor(index / 42 * 5) + (hit ? 1 : 0);

    window.postMessage(
      {
        pluginMessage: {
          type: 'scan-progress',
          index: index,
          total: 42,
          name: nodeName,
          hit: hit,
          found: found,
        },
      },
      '*'
    );

    index++;
    if (index > 42) {
      clearInterval(interval);
      // Send final result after a brief delay
      setTimeout(() => {
        injectMockScanResult();
      }, 500);
    }
  }, 100);
}

function injectMockStripProgress() {
  // Simulate strip progress updates
  let index = 0;
  const statuses = ['in-progress', 'done', 'done', 'error', 'skipped'];

  mockFrames.forEach((frame, idx) => {
    setTimeout(() => {
      const statusIdx = Math.min(idx, statuses.length - 1);
      const status = statuses[statusIdx];
      const reasons = {
        error: 'Structure changed during strip',
        skipped: 'Already clean',
      };

      window.postMessage(
        {
          pluginMessage: {
            type: 'strip-progress',
            id: frame.id,
            status: status,
            reason: reasons[status] || undefined,
          },
        },
        '*'
      );

      if (idx === mockFrames.length - 1) {
        setTimeout(() => {
          window.postMessage(
            {
              pluginMessage: {
                type: 'done',
                stripped: 3,
                skipped: 1,
                errored: 1,
              },
            },
            '*'
          );
        }, 500);
      }
    }, idx * 300);
  });
}

// Export for use in test/demo environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    injectMockScanResult,
    injectMockScanning,
    injectMockStripProgress,
  };
}

// Make available in console for manual testing
window.mockData = {
  injectScanResult: injectMockScanResult,
  injectScanning: injectMockScanning,
  injectStripProgress: injectMockStripProgress,
};
