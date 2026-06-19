const CONFIG = {
  // 混淆程度等级配置
  obfuscationLevel: 'medium', // 'light' | 'medium' | 'heavy'

  detectionPoints: {
    userAgent: false,           // 由 disguise 模块负责
    navigator: false,          // 由 disguise 模块负责
    screen: true,             // 屏幕信息
    timezone: true,           // 时区信息
    canvas: true,             // Canvas 指纹
    webgl: true,              // WebGL 指纹
    fonts: true,              // 字体指纹
    geolocation: true,        // 地理位置
    webrtc: true,            // WebRTC 指纹
    audio: true              // 音频指纹
  },
  
  // 存储配置
  storage: {
    fingerprintKey: 'browser_fingerprint_data',
    sessionKey: 'fingerprint_session_id',
    version: '2.0'
  },
  
  // 是否开启全局 API
  globalApiEnabled: false,

  // 调试配置
  debug: false
};

const Utils = {
  // 基于种子的随机数生成器
  createSeededRandom(seed) {
    let state = seed;
    return {
      next() {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      },
      range(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
      },
      choice(array) {
        return array[Math.floor(this.next() * array.length)];
      }
    };
  },

  // 日志工具
  log(message, data = null) {
    if (CONFIG.debug) {
      console.log(`[FingerprintRandomizer] ${message}`, data || '');
    }
  },

  // 错误处理
  handleError(message, error) {
    console.warn(`[FingerprintRandomizer] ${message}:`, error);
  },

  // 生成会话ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // 检查是否为Chrome扩展环境
  isChromeExtension() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  },

  // 安全检查 - 避免在关键环境中应用混淆
  shouldSkipFingerprinting() {
    // 在Chrome扩展环境中跳过混淆
    if (this.isChromeExtension()) {
      Utils.log('检测到Chrome扩展环境，跳过指纹混淆');
      return true;
    }

    // 检查是否为特殊协议
    const protocol = window.location.protocol;
    if (['chrome-extension:', 'moz-extension:', 'ms-browser-extension:', 'about:', 'data:', 'blob:'].includes(protocol)) {
      Utils.log('检测到特殊协议，跳过指纹混淆: ' + protocol);
      return true;
    }

    return false;
  },

  // 获取混淆等级配置
  getObfuscationLevelConfig() {
    const level = CONFIG.obfuscationLevel;
    const configs = {
      light: {
        name: '轻度混淆',
        enabledPoints: ['screen', 'timezone'],
        webrtcProtection: false,
        canvasNoiseIntensity: 0.05,
        description: '基础指纹混淆，影响最小'
      },
      medium: {
        name: '中度混淆', 
        enabledPoints: ['screen', 'timezone', 'canvas', 'webgl', 'fonts'],
        webrtcProtection: false,
        canvasNoiseIntensity: 0.1,
        description: '平衡的指纹混淆，适合日常使用'
      },
      heavy: {
        name: '重度混淆',
        enabledPoints: ['screen', 'timezone', 'canvas', 'webgl', 'fonts', 'geolocation', 'webrtc', 'audio'],
        webrtcProtection: true,
        canvasNoiseIntensity: 0.15,
        description: '最强指纹混淆，包含WebRTC IP泄露防护'
      }
    };
    return configs[level] || configs.medium;
  },

  // 应用混淆等级配置
  applyObfuscationLevel() {
    const config = this.getObfuscationLevelConfig();
    
    // 根据混淆等级调整检测点
    Object.keys(CONFIG.detectionPoints).forEach(point => {
      CONFIG.detectionPoints[point] = config.enabledPoints.includes(point);
    });
    
    Utils.log(`应用${config.name}配置: ${config.description}`);
    return config;
  }
};

// ================================
// 3. 指纹数据生成模块
// ================================
const FingerprintGenerator = {
  // 生成完整指纹
  generate() {
    const seed = Date.now() + Math.random();
    const rng = Utils.createSeededRandom(seed);
    
    const osData = this.generateOSData(rng);
    const browserData = this.generateBrowserData(rng, osData);
    
    return {
      userAgent: this.buildUserAgent(osData, browserData),
      language: this.generateLanguage(rng),
      platform: osData.platform,
      hardwareConcurrency: this.generateHardwareConcurrency(rng),
      deviceMemory: this.generateDeviceMemory(rng),
      screen: this.generateScreen(rng),
      timezone: this.generateTimezone(rng),
      plugins: this.generatePlugins(rng),
      canvas: this.generateCanvasFingerprint(rng),
      webgl: this.generateWebGLFingerprint(rng, osData),
      audio: this.generateAudioFingerprint(rng),
      webrtc: this.generateWebRTCFingerprint(rng),
      fonts: this.generateFonts(rng, osData),
      geolocation: this.generateGeolocation(rng),
      metadata: {
        generated: Date.now(),
        seed: seed,
        osData: osData,
        browserData: browserData
      }
    };
  },

  // 操作系统数据生成
  generateOSData(rng) {
    const osTypes = [
      {
        name: 'Windows',
        versions: ['10.0', '11.0'],
        platforms: ['Win32', 'Win64; x64'],
        getVersionString: (version, platform) => {
          const isWin11 = version === '11.0';
          return isWin11 ? `Windows NT 10.0; ${platform}; rv:109.0` : `Windows NT ${version}; ${platform}`;
        }
      },
      {
        name: 'macOS',
        versions: ['10_15_7', '11_7_10', '12_6_8', '13_5_2', '14_1'],
        platforms: ['Intel', 'PPC'],
        getVersionString: (version, platform) => `Macintosh; ${platform} Mac OS X ${version}`
      },
      {
        name: 'Linux',
        versions: ['x86_64', 'i686'],
        platforms: ['X11'],
        getVersionString: (version, platform) => `${platform}; Linux ${version}`
      }
    ];
    
    const selectedOS = rng.choice(osTypes);
    const version = rng.choice(selectedOS.versions);
    const platform = rng.choice(selectedOS.platforms);
    
    return {
      name: selectedOS.name,
      version: version,
      platform: platform,
      versionString: selectedOS.getVersionString(version, platform)
    };
  },

  // 浏览器数据生成
  generateBrowserData(rng, osData) {
    let browsers = [
      {
        name: 'Chrome',
        versions: ['119.0.6045.105', '120.0.6099.109', '121.0.6167.85', '122.0.6261.94'],
        engines: { webkit: ['537.36'] }
      },
      {
        name: 'Firefox',
        versions: ['118.0', '119.0', '120.0', '121.0'],
        engines: { gecko: ['20100101'] }
      }
    ];
    
    // Safari 只在 macOS 上出现
    if (osData.name === 'macOS') {
      browsers.push({
        name: 'Safari',
        versions: ['16.6', '17.0', '17.1'],
        engines: { webkit: ['605.1.15', '537.36'] }
      });
    }
    
    const selectedBrowser = rng.choice(browsers);
    const version = rng.choice(selectedBrowser.versions);
    
    return {
      name: selectedBrowser.name,
      version: version,
      engines: selectedBrowser.engines
    };
  },

  // UserAgent 构建
  buildUserAgent(osData, browserData) {
    switch (browserData.name) {
      case 'Chrome':
        return `Mozilla/5.0 (${osData.versionString}) AppleWebKit/${browserData.engines.webkit[0]} (KHTML, like Gecko) Chrome/${browserData.version} Safari/${browserData.engines.webkit[0]}`;
      case 'Firefox':
        return `Mozilla/5.0 (${osData.versionString}) Gecko/${browserData.engines.gecko[0]} Firefox/${browserData.version}`;
      case 'Safari':
        return `Mozilla/5.0 (${osData.versionString}) AppleWebKit/${browserData.engines.webkit[0]} (KHTML, like Gecko) Version/${browserData.version} Safari/${browserData.engines.webkit[0]}`;
      default:
        return `Mozilla/5.0 (${osData.versionString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
    }
  },

  // 基础属性生成
  generateLanguage(rng) {
    const languages = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE'];
    return rng.choice(languages);
  },

  generateHardwareConcurrency(rng) {
    return rng.range(2, 17); // 2-16核心
  },

  generateDeviceMemory(rng) {
    return rng.choice([4, 8, 16, 32]); // 常见内存大小
  },

  generateScreen(rng) {
    const resolutions = [
      {width: 1920, height: 1080},
      {width: 2560, height: 1440},
      {width: 3440, height: 1440},
      {width: 3840, height: 2160},
      {width: 1366, height: 768},
      {width: 1680, height: 1050}
    ];
    const resolution = rng.choice(resolutions);
    return {
      width: resolution.width,
      height: resolution.height,
      colorDepth: 24,
      pixelDepth: 24
    };
  },

  generateTimezone(rng) {
    const timezones = [
      'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo',
      'America/Los_Angeles', 'Europe/Paris', 'Australia/Sydney', 'Asia/Seoul'
    ];
    return rng.choice(timezones);
  },

  generatePlugins(rng) {
    const allPlugins = [
      'Chrome PDF Plugin',
      'Chrome PDF Viewer',
      'Native Client',
      'Widevine Content Decryption Module',
      'Shockwave Flash',
      'Java Deployment Toolkit'
    ];
    const count = Math.min(rng.range(2, 6), allPlugins.length);
    const shuffled = [...allPlugins].sort(() => rng.next() - 0.5);
    return shuffled.slice(0, count);
  },

  // 高级指纹生成
  generateCanvasFingerprint(rng) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars[Math.floor(rng.next() * chars.length)];
    }
    return result;
  },

  generateWebGLFingerprint(rng, osData) {
    let vendors, renderers;
    
    if (osData.name === 'Windows') {
      vendors = ['Google Inc.', 'NVIDIA Corporation', 'AMD', 'Intel Inc.'];
      renderers = [
        'ANGLE (Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)',
        'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
        'ANGLE (AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)'
      ];
    } else if (osData.name === 'macOS') {
      vendors = ['Apple Inc.', 'Intel Inc.', 'AMD'];
      renderers = [
        'Apple M1 Pro',
        'AMD Radeon Pro 5500M OpenGL Engine',
        'Intel(R) Iris(TM) Plus Graphics 655'
      ];
    } else {
      vendors = ['Mesa/X.org', 'NVIDIA Corporation', 'AMD'];
      renderers = [
        'Mesa DRI Intel(R) UHD Graphics (CML GT2)',
        'NVIDIA GeForce GTX 1060/PCIe/SSE2',
        'AMD RADV POLARIS10 (LLVM 12.0.0, DRM 3.40, 5.11.0)'
      ];
    }
    
    return {
      vendor: rng.choice(vendors),
      renderer: rng.choice(renderers)
    };
  },

  generateAudioFingerprint(rng) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(rng.next() * chars.length)];
    }
    return result;
  },

  generateWebRTCFingerprint(rng) {
    const ipPrefixes = ['192.168.', '10.0.', '172.16.'];
    const prefix = rng.choice(ipPrefixes);
    return {
      localIP: prefix + rng.range(1, 255) + '.' + rng.range(1, 255),
      iceConnectionState: rng.choice(['completed', 'connected', 'checking'])
    };
  },

  generateFonts(rng, osData) {
    let commonFonts = [
      'Arial', 'Times New Roman', 'Helvetica', 'Comic Sans MS', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Courier New',
      'Arial Black', 'Impact', 'Lucida Sans Unicode', 'Tahoma', 'Trebuchet MS'
    ];
    
    // 根据操作系统添加特定字体
    if (osData.name === 'Windows') {
      commonFonts = commonFonts.concat([
        'Segoe UI', 'Calibri', 'Cambria', 'Candara', 'Consolas', 'Constantia', 'Corbel', 'Microsoft Sans Serif'
      ]);
    } else if (osData.name === 'macOS') {
      commonFonts = commonFonts.concat([
        'SF Pro Display', 'SF Pro Text', 'Avenir', 'Menlo', 'Monaco', 'Optima'
      ]);
    } else {
      commonFonts = commonFonts.concat([
        'Ubuntu', 'Liberation Sans', 'DejaVu Sans', 'Noto Sans'
      ]);
    }
    
    if (osData.name === 'Windows' || rng.next() > 0.7) {
      commonFonts = commonFonts.concat(['SimSun', 'SimHei', 'Microsoft YaHei', 'KaiTi', 'FangSong']);
    }
    
    const fontCount = Math.min(rng.range(20, 36), commonFonts.length);
    const shuffled = [...commonFonts].sort(() => rng.next() - 0.5);
    return shuffled.slice(0, fontCount).sort();
  },

  generateGeolocation(rng) {
    return {
      enabled: rng.next() > 0.3,
      accuracy: rng.range(10, 110),
      latitude: (rng.next() - 0.5) * 180,
      longitude: (rng.next() - 0.5) * 360,
      altitude: rng.next() > 0.5 ? rng.range(0, 1000) : null,
      speed: rng.next() > 0.8 ? rng.range(0, 20) : null
    };
  }
};

// ================================
// 4. 会话管理模块
// ================================
const SessionManager = {
  // 获取当前会话ID
  getCurrentSessionId() {
    let sessionId = sessionStorage.getItem(CONFIG.storage.sessionKey);
    if (!sessionId) {
      sessionId = Utils.generateSessionId();
      sessionStorage.setItem(CONFIG.storage.sessionKey, sessionId);
      Utils.log('生成新的会话ID', sessionId);
    }
    return sessionId;
  },

  // 从存储加载指纹
  loadFingerprint() {
    try {
      const stored = localStorage.getItem(CONFIG.storage.fingerprintKey);
      if (stored) {
        const data = JSON.parse(stored);
        const currentSessionId = this.getCurrentSessionId();
        
        // 检查是否为同一会话
        if (data.sessionId === currentSessionId) {
          Utils.log('使用会话缓存的指纹');
          return data.fingerprint;
        } else {
          Utils.log('新会话，生成新指纹');
          return null;
        }
      }
    } catch (error) {
      Utils.handleError('加载指纹失败', error);
    }
    return null;
  },

  // 保存指纹到存储
  saveFingerprint(fingerprint) {
    try {
      const data = {
        fingerprint: fingerprint,
        timestamp: Date.now(),
        sessionId: this.getCurrentSessionId(),
        version: CONFIG.storage.version
      };
      localStorage.setItem(CONFIG.storage.fingerprintKey, JSON.stringify(data));
      Utils.log('指纹已保存到本地存储');
    } catch (error) {
      Utils.handleError('保存指纹失败', error);
    }
  },

  // 清除存储的数据
  clearStorage() {
    try {
      localStorage.removeItem(CONFIG.storage.fingerprintKey);
      sessionStorage.removeItem(CONFIG.storage.sessionKey);
      Utils.log('存储数据已清除');
    } catch (error) {
      Utils.handleError('清除存储失败', error);
    }
  },

  // 获取存储统计
  getStorageStats() {
    try {
      const stored = localStorage.getItem(CONFIG.storage.fingerprintKey);
      if (stored) {
        const data = JSON.parse(stored);
        const age = Date.now() - data.timestamp;
        return {
          hasStored: true,
          age: age,
          ageHours: Math.floor(age / (1000 * 60 * 60)),
          sessionId: data.sessionId,
          version: data.version
        };
      }
    } catch (error) {
      Utils.handleError('获取统计信息失败', error);
    }
    return { hasStored: false };
  }
};

// ================================
// 5. 指纹应用模块
// ================================
const FingerprintApplier = {
  // 应用所有指纹修改
  apply(fingerprint) {
    Utils.log('开始应用指纹修改', {
      userAgent: fingerprint.userAgent.substring(0, 50) + '...',
      platform: fingerprint.platform,
      language: fingerprint.language
    });

    // 应用各个检测点
    if (CONFIG.detectionPoints.userAgent) this.applyUserAgent(fingerprint.userAgent);
    if (CONFIG.detectionPoints.navigator) this.applyNavigatorProperties(fingerprint);
    if (CONFIG.detectionPoints.screen) this.applyScreenProperties(fingerprint.screen);
    if (CONFIG.detectionPoints.timezone) this.applyTimezone(fingerprint.timezone);
    if (CONFIG.detectionPoints.canvas) this.applyCanvasFingerprint(fingerprint.canvas);
    if (CONFIG.detectionPoints.webgl) this.applyWebGLFingerprint(fingerprint.webgl);
    if (CONFIG.detectionPoints.fonts) this.applyFontsFingerprint(fingerprint.fonts);
    if (CONFIG.detectionPoints.geolocation) this.applyGeolocationFingerprint(fingerprint.geolocation);
    if (CONFIG.detectionPoints.webrtc) this.applyWebRTCFingerprint(fingerprint.webrtc);
    if (CONFIG.detectionPoints.audio) this.applyAudioFingerprint(fingerprint.audio);

    Utils.log('指纹修改应用完成');
  },

  // 应用 UserAgent
  applyUserAgent(userAgent) {
    try {
      // 使用更宽松的配置，允许网站重新配置
      Object.defineProperty(navigator, 'userAgent', {
        value: userAgent,
        writable: false,
        configurable: true  // 允许重新配置
      });
    } catch (e) {
      Utils.handleError('应用UserAgent失败', e);
    }
  },

  // 应用 Navigator 属性
  applyNavigatorProperties(fingerprint) {
    const properties = [
      { name: 'language', value: fingerprint.language },
      { name: 'languages', value: [fingerprint.language] },
      { name: 'platform', value: fingerprint.platform },
      { name: 'hardwareConcurrency', value: fingerprint.hardwareConcurrency },
      { name: 'deviceMemory', value: fingerprint.deviceMemory }
    ];

    properties.forEach(prop => {
      try {
        Object.defineProperty(navigator, prop.name, {
          value: prop.value,
          writable: false,
          configurable: true  // 允许重新配置
        });
      } catch (e) {
        Utils.handleError(`应用navigator.${prop.name}失败`, e);
      }
    });
  },

  // 应用屏幕属性
  applyScreenProperties(screenData) {
    try {
      Object.defineProperty(screen, 'width', {
        value: screenData.width,
        writable: false,
        configurable: true  // 允许重新配置
      });
      Object.defineProperty(screen, 'height', {
        value: screenData.height,
        writable: false,
        configurable: true  // 允许重新配置
      });
    } catch (e) {
      Utils.handleError('应用屏幕属性失败', e);
    }
  },

  // 应用时区
  applyTimezone(timezone) {
    try {
      const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = function() {
        const result = originalResolvedOptions.apply(this, arguments);
        result.timeZone = timezone;
        return result;
      };
    } catch (e) {
      Utils.handleError('应用时区失败', e);
    }
  },

  // 应用 Canvas 指纹
  applyCanvasFingerprint(canvasFingerprint) {
    try {
      const obfuscationConfig = Utils.getObfuscationLevelConfig();
      const noiseIntensity = obfuscationConfig.canvasNoiseIntensity;
      
      if (typeof CanvasRenderingContext2D !== 'undefined') {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function() {
          const result = originalGetImageData.apply(this, arguments);
          if (result && result.data) {
            for (let i = 0; i < result.data.length; i += 4) {
              if (Math.random() < noiseIntensity) {
                result.data[i] = Math.floor(Math.random() * 256);
                result.data[i + 1] = Math.floor(Math.random() * 256);
                result.data[i + 2] = Math.floor(Math.random() * 256);
              }
            }
          }
          return result;
        };
      }
      
      if (typeof HTMLCanvasElement !== 'undefined') {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          const result = originalToDataURL.apply(this, arguments);
          return result + '#' + canvasFingerprint;
        };
      }
    } catch (e) {
      Utils.handleError('应用Canvas指纹失败', e);
    }
  },

  // 应用 WebGL 指纹
  applyWebGLFingerprint(webglFingerprint) {
    try {
      // 处理 WebGL 1.0
      if (typeof WebGLRenderingContext !== 'undefined') {
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 0x1F00) return webglFingerprint.vendor;
          if (parameter === 0x1F01) return webglFingerprint.renderer;
          return originalGetParameter.apply(this, arguments);
        };
      }
      
      // 处理 WebGL 2.0
      if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
        WebGL2RenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 0x1F00) return webglFingerprint.vendor;
          if (parameter === 0x1F01) return webglFingerprint.renderer;
          return originalGetParameter2.apply(this, arguments);
        };
      }
    } catch (e) {
      Utils.handleError('应用WebGL指纹失败', e);
    }
  },

  // 应用字体指纹
  applyFontsFingerprint(fontsData) {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        Object.defineProperty(document.fonts, 'size', {
          value: fontsData.length,
          writable: false,
          configurable: true  // 允许重新配置
        });
        
        document.fonts.check = function(font) {
          const fontFamily = font.split(' ').pop().replace(/["']/g, '');
          return fontsData.includes(fontFamily);
        };
      }
      
      if (typeof CanvasRenderingContext2D !== 'undefined') {
        const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
          const result = originalMeasureText.apply(this, arguments);
          const currentFont = this.font || '10px sans-serif';
          const fontFamily = currentFont.split(' ').pop().replace(/["']/g, '');
          if (!fontsData.includes(fontFamily)) {
            const backup = this.font;
            this.font = this.font.replace(fontFamily, 'Arial');
            const backupResult = originalMeasureText.apply(this, arguments);
            this.font = backup;
            return backupResult;
          }
          return result;
        };
      }
    } catch (e) {
      Utils.handleError('应用字体指纹失败', e);
    }
  },

  // 应用地理位置指纹
  applyGeolocationFingerprint(geoData) {
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = function(success, error) {
          if (!geoData.enabled) {
            if (error) {
              error({
                code: 1,
                message: 'User denied the request for Geolocation.'
              });
            }
            return;
          }
          
          if (success) {
            success({
              coords: {
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                altitude: geoData.altitude,
                accuracy: geoData.accuracy,
                altitudeAccuracy: geoData.altitude ? 10 : null,
                heading: null,
                speed: geoData.speed
              },
              timestamp: Date.now()
            });
          }
        };
        
        navigator.geolocation.watchPosition = function(success, error) {
          navigator.geolocation.getCurrentPosition(success, error);
          return Math.floor(Math.random() * 1000000);
        };
        
        navigator.geolocation.clearWatch = function() {};
      }
    } catch (e) {
      Utils.handleError('应用地理位置指纹失败', e);
    }
  },

  // 应用WebRTC指纹
  applyWebRTCFingerprint(webrtcFingerprint) {
    try {
      const obfuscationConfig = Utils.getObfuscationLevelConfig();
      
      if (typeof RTCPeerConnection !== 'undefined') {
        // 重度模式下的WebRTC IP泄露防护
        if (obfuscationConfig.webrtcProtection) {
          this.applyWebRTCIPProtection();
        }
        
        const originalGetStats = RTCPeerConnection.prototype.getStats;
        RTCPeerConnection.prototype.getStats = function() {
          return originalGetStats.apply(this, arguments).then(stats => {
            const modifiedStats = new Map();
            stats.forEach((value, key) => {
              if (value.type === 'local-candidate' && value.ip) {
                modifiedStats.set(key, {
                  ...value,
                  ip: webrtcFingerprint.localIP
                });
              } else {
                modifiedStats.set(key, value);
              }
            });
            return modifiedStats;
          });
        };
        
        Object.defineProperty(RTCPeerConnection.prototype, 'iceConnectionState', {
          get: function() {
            return webrtcFingerprint.iceConnectionState;
          },
          configurable: true  // 允许重新配置
        });
      }
    } catch (e) {
      Utils.handleError('应用WebRTC指纹失败', e);
    }
  },

  // WebRTC IP泄露防护（重度模式专用）
  applyWebRTCIPProtection() {
    try {
      // 全局禁用WebRTC的本地IP获取
      if (typeof RTCPeerConnection !== 'undefined') {
        const OriginalRTCPeerConnection = RTCPeerConnection;
        
        window.RTCPeerConnection = function(configuration = {}, constraints) {
          // 强制设置为只使用中继服务器，防止本地IP泄露
          const safeConfig = {
            ...configuration,
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }
            ],
            iceTransportPolicy: 'relay', // 强制使用中继
            bundlePolicy: 'max-bundle'
          };
          
          const pc = new OriginalRTCPeerConnection(safeConfig, constraints);
          
          // 重写createDataChannel方法，防止绕过
          const originalCreateDataChannel = pc.createDataChannel;
          pc.createDataChannel = function() {
            Utils.log('WebRTC DataChannel 创建被拦截（IP泄露防护）');
            return originalCreateDataChannel.apply(this, arguments);
          };
          
          // 重写createOffer方法，过滤本地IP
          const originalCreateOffer = pc.createOffer;
          pc.createOffer = function(options) {
            Utils.log('WebRTC Offer 创建被拦截（IP泄露防护）');
            return originalCreateOffer.call(this, {
              ...options,
              iceRestart: false,
              offerToReceiveAudio: false,
              offerToReceiveVideo: false
            });
          };
          
          // 重写setLocalDescription，过滤SDP中的本地IP
          const originalSetLocalDescription = pc.setLocalDescription;
          pc.setLocalDescription = function(description) {
            if (description && description.sdp) {
              // 过滤SDP中的本地IP地址
              description.sdp = description.sdp.replace(
                /c=IN IP4 (192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\S+/g, 
                'c=IN IP4 0.0.0.0'
              );
              description.sdp = description.sdp.replace(
                /a=candidate:[0-9a-f]+ \d+ udp \d+ (192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\S+/g,
                ''
              );
              Utils.log('SDP 中的本地IP已被过滤');
            }
            return originalSetLocalDescription.call(this, description);
          };
          
          return pc;
        };
        
        // 保持原始构造函数的属性
        Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
        window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
        
        Utils.log('WebRTC IP泄露防护已启用（重度模式）');
      }
      
      // 禁用getUserMedia的本地IP获取
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = function(constraints) {
          Utils.log('getUserMedia 调用被监控（IP泄露防护）');
          return originalGetUserMedia.apply(this, arguments);
        };
      }
      
    } catch (e) {
      Utils.handleError('WebRTC IP泄露防护失败', e);
    }
  },

  // 应用音频指纹
  applyAudioFingerprint(audioFingerprint) {
    try {
      // 音频指纹混淆逻辑
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const OriginalAudioContext = AudioContext || webkitAudioContext;
        const originalCreateAnalyser = OriginalAudioContext.prototype.createAnalyser;
        
        OriginalAudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.apply(this, arguments);
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
          
          analyser.getFloatFrequencyData = function(array) {
            originalGetFloatFrequencyData.apply(this, arguments);
            // 添加基于audioFingerprint的噪声
            for (let i = 0; i < array.length; i++) {
              array[i] += (Math.random() - 0.5) * 0.0001;
            }
          };
          
          return analyser;
        };
      }
    } catch (e) {
      Utils.handleError('应用音频指纹失败', e);
    }
  }
};

// ================================
// 6. 主控制器模块
// ================================
const FingerprintController = {
  currentFingerprint: null,

  // 初始化指纹系统
  initialize() {
    Utils.log('初始化指纹随机化器 v2.0');

    // 安全检查 - 在关键环境中跳过初始化
    if (Utils.shouldSkipFingerprinting()) {
      Utils.log('检测到特殊环境，跳过指纹初始化');
      return;
    }

    // 应用混淆等级配置
    const obfuscationConfig = Utils.applyObfuscationLevel();

    // 获取或生成指纹
    this.currentFingerprint = SessionManager.loadFingerprint();

    if (!this.currentFingerprint) {
      Utils.log('生成新的指纹');
      this.currentFingerprint = FingerprintGenerator.generate();
      SessionManager.saveFingerprint(this.currentFingerprint);
    }

    // 应用指纹
    FingerprintApplier.apply(this.currentFingerprint);

    // 设置全局接口
    if (CONFIG.globalApiEnabled) this.setupGlobalAPI();

    Utils.log(`指纹随机化器初始化完成 - ${obfuscationConfig.name}`);
  },

  // 设置全局API
  setupGlobalAPI() {
    if (typeof window !== 'undefined') {
      window.FingerprintRandomizer = {
        // 获取当前指纹
        getCurrentFingerprint: () => this.currentFingerprint,
        
        // 更新指纹（新会话）
        updateFingerprint: () => {
          this.currentFingerprint = FingerprintGenerator.generate();
          SessionManager.saveFingerprint(this.currentFingerprint);
          Utils.log('指纹已更新，刷新页面生效');
          return this.currentFingerprint;
        },
        
        // 清除指纹数据
        clearFingerprint: () => {
          SessionManager.clearStorage();
          this.currentFingerprint = null;
          Utils.log('指纹数据已清除');
        },
        
        // 获取统计信息
        getStats: () => SessionManager.getStorageStats(),
        
        // 获取配置
        getConfig: () => CONFIG,
        
        // 设置检测点
        setDetectionPoint: (point, enabled) => {
          if (CONFIG.detectionPoints.hasOwnProperty(point)) {
            CONFIG.detectionPoints[point] = enabled;
            Utils.log(`检测点 ${point} ${enabled ? '已启用' : '已禁用'}`);
          }
        },
        
        // 批量设置检测点
        setDetectionPoints: (points) => {
          Object.assign(CONFIG.detectionPoints, points);
          Utils.log('检测点配置已更新', points);
        },

        // 设置混淆等级
        setObfuscationLevel: (level) => {
          if (['light', 'medium', 'heavy'].includes(level)) {
            CONFIG.obfuscationLevel = level;
            const config = Utils.applyObfuscationLevel();
            Utils.log(`混淆等级已设置为: ${config.name}`);
            return config;
          } else {
            Utils.log('无效的混淆等级，支持: light, medium, heavy');
          }
        },

        // 获取混淆等级信息
        getObfuscationLevel: () => {
          const config = Utils.getObfuscationLevelConfig();
          return {
            current: CONFIG.obfuscationLevel,
            config: config,
            availableLevels: ['light', 'medium', 'heavy']
          };
        },
        
        // 获取版本信息
        getVersion: () => '2.0',
        
        // 帮助信息
        help: () => {
          console.log(`
=== 浏览器指纹随机化器 v2.0 重构版 ===

🎯 基础方法:
- getCurrentFingerprint(): 获取当前指纹
- updateFingerprint(): 更新指纹（新会话）
- clearFingerprint(): 清除指纹数据
- getStats(): 获取统计信息
- getConfig(): 获取配置
- getVersion(): 获取版本信息

🔧 检测点控制:
- setDetectionPoint(point, enabled): 设置单个检测点
- setDetectionPoints(points): 批量设置检测点

🛡️ 混淆程度控制:
- setObfuscationLevel(level): 设置混淆等级
- getObfuscationLevel(): 获取混淆等级信息

📊 混淆等级:
• light (轻度): 基础指纹混淆，影响最小
• medium (中度): 平衡的指纹混淆，适合日常使用  
• heavy (重度): 最强指纹混淆，包含WebRTC IP泄露防护

💡 使用示例:
FingerprintRandomizer.setObfuscationLevel('heavy') // 设置重度混淆
FingerprintRandomizer.setDetectionPoint('canvas', false) // 禁用Canvas检测
FingerprintRandomizer.setDetectionPoints({canvas: false, webgl: false}) // 批量禁用
`);
        }
      };
      
      Utils.log('🔧 输入 FingerprintRandomizer.help() 查看可用命令');
    }
  }
};

// ================================
// 7. 自动初始化
// ================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FingerprintController.initialize());
} else {
  FingerprintController.initialize();
}