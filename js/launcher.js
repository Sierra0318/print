// WebPrinter 실행(프로토콜 트리거) 모듈 (UMD)
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebPrinterLauncher = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  function buildProtocolUrl(action, params) {
    const p = new URLSearchParams(params || {});
    return `webprinter://${action}${p.toString() ? ('?' + p.toString()) : ''}`;
  }

  function launchStatus() {
    const url = buildProtocolUrl('status');
    try {
      window.location.href = url;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function launchOpen(sessionId) {
    const url = buildProtocolUrl('open', { session: sessionId });
    try {
      window.location.href = url;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function launchPrint(sessionId) {
    const url = buildProtocolUrl('print', { session: sessionId });
    try {
      window.location.href = url;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  return { launchStatus, launchOpen, launchPrint, buildProtocolUrl };
});


