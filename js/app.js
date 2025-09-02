// WebPrinter Test Application
const WebPrinterApp = {
  // Configuration
  config: {
      // detector 모듈 설정 재사용
      fixedPort: null,
      ports: [18731, 18732, 18733, 18734, 18735, 18736, 18737, 18738, 18739, 18740],
      hosts: ['127.0.0.1', 'localhost'],
      timeout: 1000,
      retryDelay: 1200,
      maxRetries: 5
  },

  // State
  state: {
      webPrinterPort: null,
      isConnecting: false
  },

  // DOM Elements
  elements: {},

  // Initialize
  init() {
      this.cacheElements();
      this.bindEvents();
      this.checkWebPrinter();
  },

  // Cache DOM elements
  cacheElements() {
      this.elements = {
          form: document.getElementById('print-form'),
          previewUrl: document.getElementById('preview-url'),
          printUrl: document.getElementById('print-url'),
          paperWidth: document.getElementById('paper-width'),
          paperHeight: document.getElementById('paper-height'),
          printBtn: document.getElementById('print-btn'),
          status: document.getElementById('status'),
          installNotice: document.getElementById('install-notice'),
          appStatus: document.getElementById('app-status'),
          appPort: document.getElementById('app-port'),
          appVersion: document.getElementById('app-version'),
          lastSession: document.getElementById('last-session'),
          refreshStatusBtn: document.getElementById('refresh-status'),
          testProtocolBtn: document.getElementById('test-protocol'),
          protocolHint: document.getElementById('protocol-hint'),
          protocolLink: document.getElementById('protocol-link'),
          logs: document.getElementById('logs')
      };
  },

  // Bind events
  bindEvents() {
      this.elements.form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.startPrint();
      });

      // Enter key shortcut
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
              const activeElement = document.activeElement;
              if (activeElement && activeElement.tagName === 'INPUT') {
                  e.preventDefault();
                  this.startPrint();
              }
          }
      });

      if (this.elements.refreshStatusBtn) {
          this.elements.refreshStatusBtn.addEventListener('click', () => this.checkWebPrinter(true));
      }

      if (this.elements.testProtocolBtn) {
          this.elements.testProtocolBtn.addEventListener('click', () => this.openProtocol());
      }
  },

  // Show status message
  showStatus(message, type = 'info') {
      const status = this.elements.status;
      status.textContent = message;
      status.className = `status ${type}`;
      status.style.display = 'block';
      
      if (type === 'success' || type === 'error') {
          setTimeout(() => {
              status.style.display = 'none';
          }, 3000);
      }
  },

  // Find WebPrinter server
  async findWebPrinter() {
      // detector 모듈 사용
      const port = await WebPrinterDetector.findServerPort({
        fixedPort: this.config.fixedPort,
        ports: this.config.ports,
        hosts: this.config.hosts,
        timeoutMs: this.config.timeout
      });
      if (port) this.log(`서버 감지: 포트 ${port}`);
      return port;
  },

  // Check WebPrinter on load
  async checkWebPrinter(manual = false) {
      const result = await WebPrinterDetector.checkInstalled({
        fixedPort: this.config.fixedPort,
        ports: this.config.ports,
        hosts: this.config.hosts,
        timeoutMs: this.config.timeout,
        maxAttempts: this.config.maxRetries
      });
      if (result.installed && result.port) {
          this.showStatus('WebPrinter가 실행 중입니다', 'success');
          this.state.webPrinterPort = result.port;
          WebPrinterInstaller.showInstallNotice(false);
          this.updateAppInfo();
      } else {
          WebPrinterInstaller.showInstallNotice(true);
          if (manual) this.showStatus('WebPrinter가 감지되지 않았습니다', 'error');
      }
  },

  async updateAppInfo() {
      try {
          if (!this.state.webPrinterPort) return;
          const res = await fetch(`http://localhost:${this.state.webPrinterPort}/version`, {
              method: 'GET',
              signal: AbortSignal.timeout(this.config.timeout)
          });
          if (res.ok) {
              const data = await res.json();
              if (this.elements.appStatus) this.elements.appStatus.textContent = '실행 중';
              if (this.elements.appPort) this.elements.appPort.textContent = this.state.webPrinterPort;
              if (this.elements.appVersion) this.elements.appVersion.textContent = data.version || '-';
          }
      } catch (e) {}
  },

  openProtocol(type = 'status', sessionId) {
      const sid = sessionId || ('web_' + Date.now());
      if (type === 'status') WebPrinterLauncher.launchStatus();
      if (type === 'open') WebPrinterLauncher.launchOpen(sid);
      if (type === 'print') WebPrinterLauncher.launchPrint(sid);
      const proto = WebPrinterLauncher.buildProtocolUrl(type === 'print' ? 'print' : type, type === 'print' || type === 'open' ? { session: sid } : {});
      if (this.elements.protocolHint && this.elements.protocolLink) {
          this.elements.protocolHint.style.display = 'block';
          this.elements.protocolLink.href = proto;
          this.elements.protocolLink.textContent = proto;
      }
      if (this.elements.lastSession && (type === 'open' || type === 'print')) this.elements.lastSession.textContent = sid;
      this.log(`프로토콜 호출: ${proto}`);
      return sid;
  },

  // Validate form inputs
  validateInputs() {
      const previewUrl = this.elements.previewUrl.value.trim();
      const printUrl = this.elements.printUrl.value.trim();
      const paperWidth = parseFloat(this.elements.paperWidth.value);
      const paperHeight = parseFloat(this.elements.paperHeight.value);

      if (!previewUrl && !printUrl) {
          this.showStatus('URL을 입력하세요.', 'error');
          return null;
      }

      if (!paperWidth || !paperHeight || paperWidth <= 0 || paperHeight <= 0) {
          this.showStatus('올바른 용지 크기를 입력하세요.', 'error');
          return null;
      }

      return { previewUrl, printUrl, paperWidth, paperHeight };
  },

  // Send data to WebPrinter
  async sendToWebPrinter(port, sessionId, data) {
      const response = await fetch(`http://localhost:${port}/send-urls`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              session: sessionId,
              preview_url: data.previewUrl,
              print_url: data.printUrl,
              paper_width: data.paperWidth,
              paper_height: data.paperHeight,
              paper_size: 'Custom',
              print_selector: '#print_wrap'
          })
      });

      const result = await response.json();
      
      if (!result.success) {
          throw new Error(result.error || '전송 실패');
      }
      
      return result;
  },

  // Start print process
  async startPrint() {
      if (this.state.isConnecting) return;

      const data = this.validateInputs();
      if (!data) return;

      this.state.isConnecting = true;
      this.elements.printBtn.disabled = true;
      
      this.showStatus('WebPrinter 연결 중...', 'info');

      try {
          // 1) 앱 깨우기(status) → 서버 탐지
          this.openProtocol('status');
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          let port = await this.findWebPrinter();
          for (let i = 0; !port && i < this.config.maxRetries; i++) {
              await new Promise(r => setTimeout(r, this.config.retryDelay));
              port = await this.findWebPrinter();
          }
          if (!port) throw new Error('WebPrinter를 찾을 수 없습니다');
          this.state.webPrinterPort = port;

          // 2) 세션 생성 및 창 오픈(or 바로 print)
          const sessionId = this.openProtocol('open');

          // 3) 인쇄 데이터 전송
          await this.sendToWebPrinter(port, sessionId, data);
          
          this.showStatus('✅ 인쇄 정보를 전송했습니다!', 'success');
          this.elements.installNotice.style.display = 'none';
          this.updateAppInfo();

      } catch (error) {
          this.showStatus(`❌ ${error.message}`, 'error');
          this.elements.installNotice.style.display = 'block';
      } finally {
          this.state.isConnecting = false;
          this.elements.printBtn.disabled = false;
      }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  WebPrinterApp.init();
});

// Simple logger
WebPrinterApp.log = function(message) {
  const el = WebPrinterApp.elements.logs;
  if (!el) return;
  const ts = new Date().toLocaleTimeString();
  el.textContent += `[${ts}] ${message}\n`;
  el.scrollTop = el.scrollHeight;
};