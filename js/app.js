// WebPrinter Test Application
const WebPrinterApp = {
  // Configuration
  config: {
      // detector 모듈 설정 재사용
      fixedPort: null,
      ports: [18731, 18732, 18733, 18734, 18735, 18736, 18737, 18738, 18739, 18740],
      hosts: ['127.0.0.1', 'localhost'],
      timeout: 700,
      retryDelay: 600,
      maxRetries: 3
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
          tourId: document.getElementById('tour-id'),
          nation: document.getElementById('nation'),
          printBtn: document.getElementById('print-btn'),
          status: document.getElementById('status'),
          appStatus: document.getElementById('app-status'),
          appVersion: document.getElementById('app-version'),
          latestVersion: document.getElementById('latest-version'),
          refreshStatusBtn: document.getElementById('refresh-status'),
          updateNowBtn: document.getElementById('btn-update-now')
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

      if (this.elements.updateNowBtn) {
          this.elements.updateNowBtn.addEventListener('click', async () => {
              try {
                  const info = await WebPrinterInstaller.getLatestInfo();
                  const url = info && info.exeUrl ? info.exeUrl : undefined;
                  WebPrinterInstaller.goToInstallPage(url);
              } catch {
                  WebPrinterInstaller.goToInstallPage();
              }
          });
      }

      // 다운로드 버튼 제거됨
  },

  // Show status message
  showStatus(message, type = 'info') {
      // Toast 제거: 화면 표시 대신 콘솔 로깅만 수행
      try { this.log(`[${type}] ${message}`); } catch {}
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
        maxAttempts: this.config.maxRetries,
        concurrency: 4
      });
      if (result.installed && result.port) {
          this.elements.appStatus && (this.elements.appStatus.textContent = '설치완료');
          if (this.elements.appVersion) this.elements.appVersion.textContent = result.version || '-';
          this.showStatus('설치완료', 'success');
          this.state.webPrinterPort = result.port;
          this.elements.printBtn.disabled = false;
          // 필요 시 상세 버전 재확인
          if (!result.version) this.updateAppInfo();
          // 최신 버전 조회 복원 (미러 사용)
          try {
              const info = await WebPrinterInstaller.getLatestInfo();
              if (info && info.version && this.elements.latestVersion) {
                  this.elements.latestVersion.textContent = info.version;
              }
              if (this.elements.updateNowBtn) {
                  if (info && info.version && result.version && info.version !== result.version) {
                      this.elements.updateNowBtn.style.display = 'inline-block';
                  } else {
                      this.elements.updateNowBtn.style.display = 'none';
                  }
              }
          } catch {}
      } else {
          this.elements.printBtn.disabled = true;
          if (this.elements.appStatus) this.elements.appStatus.textContent = '설치가 필요합니다.';
          if (this.elements.appVersion) this.elements.appVersion.textContent = '-';
          // 최신 설치 파일 링크를 최신으로 갱신
          try {
              const info = await WebPrinterInstaller.getLatestInfo();
              if (info && info.exeUrl && this.elements.downloadLatest) {
                  this.elements.downloadLatest.href = info.exeUrl;
              }
              if (this.elements.updateNowBtn) this.elements.updateNowBtn.style.display = 'inline-block';
          } catch {}
          if (manual) this.showStatus('설치가 필요합니다.', 'error');
      }
  },

  // 최신 버전 원격 확인 로직은 CORS 이슈로 비활성화 (UI는 정적 링크만 유지)

  async updateAppInfo() {
      try {
          if (!this.state.webPrinterPort) return;
          const res = await fetch(`http://localhost:${this.state.webPrinterPort}/version`, {
              method: 'GET',
              signal: AbortSignal.timeout(this.config.timeout)
          });
          if (res.ok) {
              const data = await res.json();
              if (this.elements.appStatus) this.elements.appStatus.textContent = '설치완료';
              if (this.elements.appVersion) this.elements.appVersion.textContent = data.version || '-';
              // 최신 버전 확인 및 업데이트 버튼 제어
              try {
                  const info = await WebPrinterInstaller.getLatestInfo();
                  if (info && info.version && data.version && info.version !== data.version) {
                      if (this.elements.latestVersion) this.elements.latestVersion.textContent = info.version;
                      if (this.elements.updateNowBtn) this.elements.updateNowBtn.style.display = 'inline-block';
                  } else if (info) {
                      if (this.elements.latestVersion) this.elements.latestVersion.textContent = info.version || '-';
                      if (this.elements.updateNowBtn) this.elements.updateNowBtn.style.display = 'none';
                  }
              } catch {}
          }
      } catch (e) {}
  },

  openProtocol(type = 'status', sessionId) {
      const sid = sessionId || ('web_' + Date.now());
      // 사용자 제스처가 필요할 수 있으므로 버튼 클릭 핸들러 내에서만 호출되도록 가정
      if (type === 'status') WebPrinterLauncher.launchStatus();
      if (type === 'open') WebPrinterLauncher.launchOpen(sid);
      if (type === 'print') WebPrinterLauncher.launchPrint(sid);
      const proto = WebPrinterLauncher.buildProtocolUrl(type === 'print' ? 'print' : type, type === 'print' || type === 'open' ? { session: sid } : {});
      // 힌트/세션 표시 제거: UI 단순화
      this.log(`프로토콜 호출: ${proto}`);
      return sid;
  },

  // Validate form inputs
  validateInputs() {
      const tourId = (this.elements.tourId?.value || '').trim();
      const nation = (this.elements.nation?.value || '').trim();
      const side = (this.elements.form?.querySelector('input[name="side"]:checked')?.value) || 'front';

      if (!tourId) {
          this.showStatus('투어번호를 입력하세요.', 'error');
          return null;
      }

      if (!nation) {
          this.showStatus('국가를 선택하세요.', 'error');
          return null;
      }

      return { tourId, nation, side };
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

      const input = this.validateInputs();
      if (!input) return;

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

          // 2) 요청 파라미터 구성 (투어번호/국가/면)
          const tourId = input.tourId;
          const nation = input.nation || 'cn';
          const side = input.side || 'front';

          const base = `https://office.plan-tour.co.kr/${encodeURIComponent(tourId)}`;
          const previewUrl = `${base}/preview/${encodeURIComponent(nation)}/${side}`;
          const printUrl = `${base}/print/${encodeURIComponent(nation)}/${side}`;

          // 3) 세션 생성 및 창 오픈
          const sessionId = this.openProtocol('open');

          // 4) 인쇄 데이터 전송 (A4 기본 mm 예시)
          await this.sendToWebPrinter(port, sessionId, {
              previewUrl,
              printUrl,
              paperWidth: 210,
              paperHeight: 297
          });
          
          this.showStatus('✅ 인쇄 정보를 전송했습니다!', 'success');
          this.updateAppInfo();

      } catch (error) {
          this.showStatus(`❌ ${error.message}`, 'error');
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