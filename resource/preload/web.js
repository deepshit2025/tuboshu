const { contextBridge, ipcRenderer, webFrame } = require('electron');

// ── 1. 从 --params 读取浏览器身份数据 ──
const paramEntry = process.argv.find(item => item.startsWith('--params='));
const context = JSON.parse(paramEntry.substring(paramEntry.indexOf('=') + 1));
const navData = context.fingerprint?.navigator || context;

// ── 2. 在 Node.js 侧预计算所有需要的数据 ──
const ua = navData.userAgent || '';
const appVer = navData.appVersion || '';
const platform = navData.platform || '';
const vendor = navData.vendor || 'Google Inc.';
const language = navData.language || 'zh-CN';
const languages = navData.languages || ['zh-CN', 'zh'];
const hwConcurrency = navData.hardwareConcurrency ?? 8;
const deviceMemory = navData.deviceMemory ?? 8;
const pluginsData = navData.plugins || [];

// 从 UA 中提取 Chrome 版本号
const chromeVerMatch = ua.match(/Chrome\/([\d.]+)/);
const chromeVersion = chromeVerMatch ? chromeVerMatch[1] : '134.0.6998.165';

const userAgentData = navData.userAgentData || {};
const uadBrands = userAgentData.brands || [
  { brand: 'Not/A?Brand', version: '8' },
  { brand: 'Chromium', version: chromeVersion.split('.')[0] },
  { brand: 'Google Chrome', version: chromeVersion.split('.')[0] },
];

// 构建完整的 fullVersionList
const fullVersionList = uadBrands.map(b => ({
  brand: b.brand,
  version: b.brand === 'Not=A?Brand' ? '99' : chromeVersion,
}));

const uadPlatform = userAgentData.platform || 'Windows';
const uadMobile = userAgentData.mobile ?? false;
const uadPlatformVersion = userAgentData.platformVersion || '10.0.0';
const uadArchitecture = userAgentData.architecture || 'x86';
const uadBitness = userAgentData.bitness || '64';

// ── 3. 构造注入代码（只用纯值，不内嵌正则） ──
function buildMainWorldScript() {
  // JSON.stringify 处理所有值，避免转义问题
  const data = {
    platform,
    vendor,
    language,
    languages,
    hwConcurrency,
    deviceMemory,
    pluginsData,
    uadBrands,
    uadPlatform,
    uadMobile,
    uadPlatformVersion,
    uadArchitecture,
    uadBitness,
    fullVersionList,
    chromeVersion,
  };
  const json = JSON.stringify(data);

  return `
(function() {
  'use strict';

  var D = ${json};

  // ═══════════════════════════════════════════
  // 1. navigator 基础属性（逐个尝试定义，跳过 non-configurable 的属性）
  // ═══════════════════════════════════════════
  (function() {
    var props = {
      platform:            { get: function() { return D.platform; }, configurable: true },
      vendor:              { get: function() { return D.vendor; }, configurable: true },
      language:            { get: function() { return D.language; }, configurable: true },
      languages:           { get: function() { return D.languages.slice(); }, configurable: true },
      hardwareConcurrency: { get: function() { return D.hwConcurrency; }, configurable: true },
      deviceMemory:        { get: function() { return D.deviceMemory; }, configurable: true },
      cookieEnabled:       { get: function() { return true; }, configurable: true },
      doNotTrack:          { get: function() { return null; }, configurable: true },
      maxTouchPoints:      { get: function() { return 0; }, configurable: true },
      onLine:              { get: function() { return true; }, configurable: true },
      product:             { get: function() { return 'Gecko'; }, configurable: true },
      productSub:          { get: function() { return '20030107'; }, configurable: true },
      appCodeName:         { get: function() { return 'Mozilla'; }, configurable: true },
      appName:             { get: function() { return 'Netscape'; }, configurable: true },
      pdfViewerEnabled:    { get: function() { return true; }, configurable: true },
    };
    Object.keys(props).forEach(function(k) {
      try {
        Object.defineProperty(navigator, k, props[k]);
      } catch(e) {}
    });
  })();

  // ═══════════════════════════════════════════
  // 2. navigator.userAgentData
  // ═══════════════════════════════════════════
  try {
    var uad = {
    brands: D.uadBrands,
    mobile: D.uadMobile,
    platform: D.uadPlatform,
    getBrands: function() { return Promise.resolve(this.brands); },
    getHighEntropyValues: function(hints) {
      var result = {};
      if (hints.indexOf('fullVersionList') !== -1) result.fullVersionList = D.fullVersionList;
      if (hints.indexOf('platformVersion') !== -1) result.platformVersion = D.uadPlatformVersion;
      if (hints.indexOf('platform') !== -1) result.platform = D.uadPlatform;
      if (hints.indexOf('architecture') !== -1) result.architecture = D.uadArchitecture;
      if (hints.indexOf('model') !== -1) result.model = '';
      if (hints.indexOf('bitness') !== -1) result.bitness = D.uadBitness;
      if (hints.indexOf('uaFullVersion') !== -1) result.uaFullVersion = D.chromeVersion;
      if (hints.indexOf('wow64') !== -1) result.wow64 = false;
      return Promise.resolve(result);
    },
    toJSON: function() {
      return { brands: this.brands, mobile: this.mobile, platform: this.platform };
    }
  };
  Object.defineProperty(navigator, 'userAgentData', {
    get: function() { return uad; },
    configurable: true
  });
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 3. navigator.plugins (PluginArray)
  // ═══════════════════════════════════════════
  (function() {
    var plugins = D.pluginsData;
    var arr = [];
    plugins.forEach(function(p, i) {
      // 把每个 plugin 添加到数组
      var entry = {
        name: p.name,
        filename: p.filename,
        description: p.description || '',
        length: (p.mimeTypes || []).length,
        0: null, 1: null, 2: null
      };
      // 挂载 MimeType 子项
      (p.mimeTypes || []).forEach(function(mt, j) {
        entry[j] = {
          type: mt.type,
          suffixes: mt.suffixes || '',
          description: mt.description || '',
          enabledPlugin: entry
        };
      });
      arr[i] = entry;
    });
    arr.item = function(idx) { return this[idx] || null; };
    arr.namedItem = function(name) {
      for (var i = 0; i < this.length; i++) {
        var p = this[i];
        if (p && p.name === name) return p;
      }
      return null;
    };
    arr.refresh = function() { return; };
    arr.toString = function() { return '[object PluginArray]'; };
    arr[Symbol.iterator] = function() {
      var idx = 0;
      var self = this;
      return {
        next: function() { return idx < self.length ? { value: self[idx++], done: false } : { done: true }; }
      };
    };
    arr.length = plugins.length;
    Object.defineProperty(navigator, 'plugins', {
      get: function() { return arr; },
      configurable: true
    });
  })();

  // ═══════════════════════════════════════════
  // 4. navigator.mimeTypes (MimeTypeArray)
  // ═══════════════════════════════════════════
  (function() {
    var mts = [];
    D.pluginsData.forEach(function(p) {
      (p.mimeTypes || []).forEach(function(mt) {
        mts.push({
          type: mt.type,
          suffixes: mt.suffixes || '',
          description: mt.description || '',
          enabledPlugin: {
            name: p.name,
            filename: p.filename,
            description: p.description || ''
          }
        });
      });
    });
    mts.item = function(idx) { return this[idx] || null; };
    mts.namedItem = function(name) {
      for (var i = 0; i < this.length; i++) {
        if (this[i].type === name) return this[i];
      }
      return null;
    };
    mts.length = mts.length;
    Object.defineProperty(navigator, 'mimeTypes', {
      get: function() { return mts; },
      configurable: true
    });
  })();

  // ═══════════════════════════════════════════
  // 5. navigator.connection
  // ═══════════════════════════════════════════
  var conn = {
    effectiveType: '4g',
    rtt: 50,
    downlink: 10,
    downlinkMax: Infinity,
    saveData: false,
    type: 'cellular',
    onchange: null,
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return true; }
  };
  Object.defineProperty(navigator, 'connection', {
    get: function() { return conn; },
    configurable: true
  });

  // ═══════════════════════════════════════════
  // 6. navigator.mediaCapabilities
  // ═══════════════════════════════════════════
  try {
    if (navigator.mediaCapabilities) {
      navigator.mediaCapabilities.decodingInfo = function(config) {
        return Promise.resolve({
          supported: true,
          smooth: true,
          powerEfficient: true,
          keySystemAccess: null
        });
      };
      navigator.mediaCapabilities.encodingInfo = function(config) {
        return Promise.resolve({
          supported: true,
          smooth: true,
          powerEfficient: true
        });
      };
    }
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 7. navigator.permissions.query
  // ═══════════════════════════════════════════
  try {
    if (navigator.permissions) {
      navigator.permissions.query = function(desc) {
        return Promise.resolve({ state: 'prompt', onchange: null });
      };
    }
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 8. navigator.geolocation
  // ═══════════════════════════════════════════
  try {
    if (navigator.geolocation) {
      var pos = {
        coords: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 65,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: 0
      };
      navigator.geolocation.getCurrentPosition = function(success) {
        pos.timestamp = Date.now();
        if (success) setTimeout(function() { success(pos); }, 5);
      };
      navigator.geolocation.watchPosition = function(success) {
        navigator.geolocation.getCurrentPosition(success);
        return Math.floor(Math.random() * 1000000) + 1;
      };
      navigator.geolocation.clearWatch = function() {};
    }
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 9. window.chrome 对象（增强，不替换原生）
  // ═══════════════════════════════════════════
  try {
    if (typeof window.chrome === 'undefined') window.chrome = {};
    var c = window.chrome;

    // app
    if (!c.app) c.app = {};
    if (!c.app.isInstalled) c.app.isInstalled = false;
    if (!c.app.InstallState) c.app.InstallState = { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' };
    if (!c.app.RunningState) c.app.RunningState = { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' };

    // csi
    if (!c.csi) c.csi = function() {
      return { onloadT: Date.now(), startE: Date.now(), pageT: Date.now(), tran: 15 };
    };

    // loadTimes
    if (!c.loadTimes) c.loadTimes = function() {
      return {
        requestTime: 0, startLoadTime: Date.now(), commitLoadTime: Date.now(),
        finishDocumentLoadTime: Date.now(), finishLoadTime: Date.now(), firstPaintTime: Date.now(),
        wasFetchedViaSpdy: true, wasNpnNegotiated: true, npnNegotiatedProtocol: 'h2',
        wasAlternateProtocolAvailable: false, connectionInfo: 'http/2'
      };
    };

    // runtime
    if (!c.runtime) c.runtime = {};
    var r = c.runtime;
    if (r.lastError === undefined) r.lastError = undefined;
    if (!r.id) r.id = undefined;
    if (!r.connect) r.connect = function() {
      return { name: '', sender: { id: undefined, url: '', origin: '' },
        postMessage: function() {},
        onMessage: { addListener: function() {}, removeListener: function() {} },
        onDisconnect: { addListener: function() {}, removeListener: function() {} } };
    };
    if (!r.sendMessage) r.sendMessage = function(extensionId, message, options, cb) {
      if (typeof cb === 'function') cb();
    };
    if (!r.getManifest) r.getManifest = function() { return { manifest_version: 3, name: '', version: '0.0' }; };
    if (!r.requestUpdateCheck) r.requestUpdateCheck = function(cb) {
      if (typeof cb === 'function') cb({ status: 'no_update', version: '' });
    };
    if (!r.onMessage) r.onMessage = { addListener: function() {}, removeListener: function() {} };
    if (!r.onConnect) r.onConnect = { addListener: function() {}, removeListener: function() {} };
    if (!r.onInstalled) r.onInstalled = { addListener: function() {}, removeListener: function() {} };

    // webstore
    if (!c.webstore) c.webstore = {};
    if (!c.webstore.onInstallStageChanged) c.webstore.onInstallStageChanged = { addListener: function() {}, removeListener: function() {} };
    if (!c.webstore.onDownloadProgress) c.webstore.onDownloadProgress = { addListener: function() {}, removeListener: function() {} };

    // storage
    if (!c.storage) c.storage = {};
    if (!c.storage.local) c.storage.local = { get: function(keys, cb) { if (cb) cb({}); }, set: function(items, cb) { if (cb) cb(); }, remove: function(keys, cb) { if (cb) cb(); }, clear: function(cb) { if (cb) cb(); } };
    if (!c.storage.sync) c.storage.sync = { get: function(keys, cb) { if (cb) cb({}); }, set: function(items, cb) { if (cb) cb(); }, remove: function(keys, cb) { if (cb) cb(); }, clear: function(cb) { if (cb) cb(); } };
    if (!c.storage.onChanged) c.storage.onChanged = { addListener: function() {}, removeListener: function() {} };

    // extension
    if (!c.extension) c.extension = {};
    if (!c.extension.getURL) c.extension.getURL = function(path) { return path || ''; };
    if (!c.extension.getBackgroundPage) c.extension.getBackgroundPage = function() { return null; };
    if (!c.extension.getViews) c.extension.getViews = function() { return []; };
    if (!c.extension.isAllowedIncognitoAccess) c.extension.isAllowedIncognitoAccess = function(cb) { if (cb) cb(false); };
    if (!c.extension.isAllowedFileSchemeAccess) c.extension.isAllowedFileSchemeAccess = function(cb) { if (cb) cb(false); };

    // i18n
    if (!c.i18n) c.i18n = {};
    if (!c.i18n.getMessage) c.i18n.getMessage = function(name) { return name || ''; };
    if (!c.i18n.getUILanguage) c.i18n.getUILanguage = function() { return 'zh-CN'; };
    if (!c.i18n.getAcceptLanguages) c.i18n.getAcceptLanguages = function(cb) { if (cb) cb(['zh-CN', 'en']); };
    if (!c.i18n.detectLanguage) c.i18n.detectLanguage = function(text, cb) { if (cb) cb({ languages: [], isReliable: false }); };

    // sidePanel
    if (!c.sidePanel) c.sidePanel = {};
    if (!c.sidePanel.setOptions) c.sidePanel.setOptions = function() { return Promise.resolve(); };
    if (!c.sidePanel.getOptions) c.sidePanel.getOptions = function() { return Promise.resolve({}); };
    if (!c.sidePanel.open) c.sidePanel.open = function() { return Promise.resolve(); };
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 10. screen 补充属性
  // ═══════════════════════════════════════════
  try {
    Object.defineProperties(screen, {
      availWidth:  { get: function() { return screen.width; }, configurable: true },
      availHeight: { get: function() { return screen.height; }, configurable: true },
      colorDepth:  { get: function() { return 24; }, configurable: true },
      pixelDepth:  { get: function() { return 24; }, configurable: true }
    });
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 11. Intl.DateTimeFormat 时区
  // ═══════════════════════════════════════════
  try {
    var OrigResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      var result = OrigResolvedOptions.call(this);
      result.timeZone = 'Asia/Shanghai';
      return result;
    };
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 12. 清理可能的泄露
  // ═══════════════════════════════════════════
  try {
    if (document.__webdriver_script_fn) delete document.__webdriver_script_fn;
    if (document.__selenium_unwrap) delete document.__selenium_unwrap;
    if (document.__driver_evaluate) delete document.__driver_evaluate;
    if (document.__webdriver_evaluate) delete document.__webdriver_evaluate;
  } catch(e) {}

  // ═══════════════════════════════════════════
  // 13. Error 栈清理（过滤 Electron 帧）
  // ═══════════════════════════════════════════
  try {
    var origPrep = Error.prepareStackTrace;
    Error.prepareStackTrace = function(err, stack) {
      if (!stack || !stack.filter) {
        return origPrep ? origPrep(err, stack) : err.stack;
      }
      var filtered = stack.filter(function(cs) {
        var fn = cs.getFileName ? (cs.getFileName() || '') : '';
        return fn.indexOf('node_modules/electron') === -1 &&
               fn.indexOf('electron.asar') === -1 &&
               fn.indexOf('electron/js2c') === -1;
      });
      if (origPrep) return origPrep(err, filtered);
      return err.name + ': ' + err.message + '\\n' +
        filtered.map(function(cs) {
          var fn = cs.getFunctionName ? cs.getFunctionName() : '';
          var file = cs.getFileName ? cs.getFileName() : '';
          var line = cs.getLineNumber ? cs.getLineNumber() : 0;
          return '    at ' + (fn || '<anonymous>') + ' (' + (file || '') + ':' + line + ')';
        }).join('\\n');
    };
  } catch(e) {}
})();
`;
}

// ── 4. 注入到 MAIN world ──
(async () => {
  const script = buildMainWorldScript();
  await webFrame.executeJavaScript(script);
})();

// ── 5. 应用层 IPC 接口（不参与伪装） ──
contextBridge.exposeInMainWorld('myApi', {
  refreshSelf: () => ipcRenderer.invoke('refresh:self')
});

ipcRenderer.on('open:window', (event, url) => {
  window.location.href = url;
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const selectionText = window.getSelection().toString().trim();
  const data = { x: e.clientX, y: e.clientY };
  if (selectionText) {
    ipcRenderer.send('copy:text', selectionText)
    ipcRenderer.send("popup:contextMenu", Object.assign(data, { status: 3 }))
    return;
  }

  const isInputElement = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
  const isContentEditable = e.target.isContentEditable;
  if (isInputElement || isContentEditable) {
    ipcRenderer.send("popup:contextMenu", Object.assign(data, { status: 5 }))
    return;
  }

  ipcRenderer.send("popup:contextMenu", Object.assign(data, { status: 1 }))
});

window.addEventListener('keydown', (event) => {
  const isInputElement = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
  const isContentEditable = event.target.isContentEditable;

  const hasInputContent = isInputElement && event.target.value.trim() !== '';
  const hasEditableContent = isContentEditable && event.target.innerText.trim() !== '';
  if (hasInputContent || hasEditableContent) {
    return;
  }

  if (event.key === "ArrowLeft") {
    ipcRenderer.send('history:goBack')
  } else if (event.key === "ArrowRight") {
    ipcRenderer.send('history:goForward')
  }
});

document.addEventListener('wheel', async (event) => {
  if (event.ctrlKey || event.metaKey) {
    const isZoomOpen = await ipcRenderer.invoke("handle:zoom");
    if (isZoomOpen) {
      event.preventDefault();
      const delta = event.deltaY;
      ipcRenderer.send('zoom:wheel', delta);
    }
  }
}, { passive: false });

document.addEventListener('fullscreenchange', async () => {
  if (document.fullscreenElement) {
    await ipcRenderer.invoke('handle:menu', true)
  } else {
    await ipcRenderer.invoke('handle:menu', false)
  }
});
