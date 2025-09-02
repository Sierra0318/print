// WebPrinter 설치 페이지 이동 모듈 (UMD)
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebPrinterInstaller = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  const DEFAULT_DOWNLOAD_URL = 'https://github.com/code-x-team/webprint-electron/releases/latest';

  function goToInstallPage(customUrl) {
    const url = customUrl || DEFAULT_DOWNLOAD_URL;
    try {
      window.open(url, '_blank', 'noopener');
      return { success: true, url };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function showInstallNotice(show) {
    const el = document.getElementById('install-notice');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  return { goToInstallPage, showInstallNotice, DEFAULT_DOWNLOAD_URL };
});


