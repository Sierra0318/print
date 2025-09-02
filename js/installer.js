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
  const BASE_URL = 'https://storage.googleapis.com/tour-gov/code-x-team/webprint-electron/latest';
  const DEFAULT_DOWNLOAD_URL = BASE_URL;

  // CORS 에러를 피하기 위해 텍스트 미러를 통해 latest.yml을 조회
  async function fetchText(url, timeout = 3000) {
    try {
      const controller = AbortSignal?.timeout ? { signal: AbortSignal.timeout(timeout) } : {};
      const mirror = (url.startsWith('https://') ? 'https://r.jina.ai/' : 'https://r.jina.ai/http://') + url.replace(/^https?:\/\//, '');
      const res = await fetch(mirror, { method: 'GET', ...(controller || {}) });
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  }

  function parseLatestYml(ymlText) {
    if (!ymlText) return null;
    // 줄 구분이 없을 수도 있으므로 전체 문자열에서 정규식으로 추출
    const vMatch = ymlText.match(/version:\s*([^\s]+)/i);
    const pMatch = ymlText.match(/path:\s*([^\s]+\.exe)/i);
    const version = vMatch ? vMatch[1].trim() : null;
    const exePath = pMatch ? pMatch[1].trim() : null;
    return { version, exePath };
  }

  async function getLatestInfo() {
    const ymlUrl = BASE_URL + '/latest.yml';
    const exeAliasUrl = BASE_URL + '/WebPrinter-Setup.exe';
    const ymlText = await fetchText(ymlUrl);
    const meta = parseLatestYml(ymlText);
    const exeUrl = meta && meta.exePath ? (BASE_URL + '/' + meta.exePath) : exeAliasUrl;
    return { version: (meta && meta.version) || null, ymlUrl, exeUrl };
  }

  function goToInstallPage(customUrl) {
    const url = customUrl || (BASE_URL + '/WebPrinter-Setup.exe');
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

  return { goToInstallPage, showInstallNotice, DEFAULT_DOWNLOAD_URL, getLatestInfo };
});


