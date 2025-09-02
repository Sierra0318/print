// WebPrinter 설치 여부/실행 상태 감지 모듈 (UMD)
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebPrinterDetector = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  const DEFAULT_CONFIG = {
    fixedPort: null,
    ports: [18731,18732,18733,18734,18735,18736,18737,18738,18739,18740],
    hosts: ['127.0.0.1', 'localhost'],
    timeoutMs: 1000,
    maxAttempts: 5,
    backoffMs: 200
  };

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = AbortSignal.timeout ? { signal: AbortSignal.timeout(timeoutMs) } : {};
    const res = await fetch(url, { method: 'GET', ...(controller || {}) });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  }

  async function tryStatus(host, port, timeoutMs) {
    try {
      const data = await fetchJsonWithTimeout(`http://${host}:${port}/status`, timeoutMs);
      if (data && data.status === 'running') return { ok: true, host, port };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }

  async function probePortAcrossHosts(hosts, port, timeoutMs) {
    for (const host of hosts) {
      const r = await tryStatus(host, port, timeoutMs);
      if (r.ok) return r;
    }
    return null;
  }

  async function findServerPort(userConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...(userConfig || {}) };
    if (cfg.fixedPort) {
      const hit = await probePortAcrossHosts(cfg.hosts, cfg.fixedPort, cfg.timeoutMs);
      if (hit) return hit.port;
      return null;
    }
    for (const port of cfg.ports) {
      const hit = await probePortAcrossHosts(cfg.hosts, port, cfg.timeoutMs);
      if (hit) return hit.port;
    }
    return null;
  }

  async function checkInstalled(userConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...(userConfig || {}) };
    let attempt = 0;
    while (attempt < cfg.maxAttempts) {
      const port = await findServerPort(cfg);
      if (port) {
        const version = await fetchJsonWithTimeout(`http://127.0.0.1:${port}/version`, cfg.timeoutMs).catch(() => null);
        return { installed: true, port, version: (version && version.version) || null };
      }
      await new Promise(r => setTimeout(r, cfg.backoffMs * Math.max(1, attempt + 1)));
      attempt++;
    }
    return { installed: false, port: null, version: null };
  }

  return { checkInstalled, findServerPort, DEFAULT_CONFIG };
});


