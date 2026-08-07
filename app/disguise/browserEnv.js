import { app } from 'electron'
import os from 'os'
import fs from 'fs'
import path from 'path'

// ── 真实 Chrome 版本列表 (130~134) ──
const CHROME_VERSIONS = [
  '130.0.6723.58', '130.0.6723.69', '130.0.6723.91', '130.0.6723.116',
  '131.0.6778.69', '131.0.6778.85', '131.0.6778.108', '131.0.6778.139',
  '132.0.6834.83', '132.0.6834.110', '132.0.6834.159', '132.0.6834.194',
  '133.0.6943.53', '133.0.6943.98', '133.0.6943.126', '133.0.6943.141',
  '134.0.6998.88', '134.0.6998.118', '134.0.6998.165', '134.0.6998.178',
]

// ── UA-CH GREASE 品牌算法（与 Chromium components/embedder_support/user_agent_utils.cc 完全一致）──
const GREASE_CHARS = [' ', '(', ':', '-', '.', '/', ')', ';', '=', '?', '_']
const GREASE_VERSIONS = ['8', '99', '24']
// 稳定排列：shuffled[order[i]] = list[i]，order = orders[seed % 6]
const BRAND_ORDERS = [
  [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
]

const WEBKIT_VERSION = '537.36'

// identity.json 结构版本：生成逻辑变更时 +1，触发旧缓存重新生成
const IDENTITY_VERSION = 2

class BrowserEnv {
  constructor() {
    this.identityPath = null
    this.env = null
  }

  // ── 公开接口 ──

  /** 供 HTTP header 改写使用的 headers */
  getHeaders() {
    this.#ensure()
    return { ...this.env.headers }
  }

  /** 两者合并 */
  getAll() {
    this.#ensure()
    return {
      identity: this.env.identity,
      headers: { ...this.env.headers },
    }
  }

  // ── 内部方法 ──

  #ensure() {
    if (this.env) return
    this.identityPath = path.join(app.getPath('userData'), 'identity.json')
    this.env = this.#loadFromDisk() || this.#generateAndSave()
  }

  #loadFromDisk() {
    try {
      if (fs.existsSync(this.identityPath)) {
        const data = JSON.parse(fs.readFileSync(this.identityPath, 'utf-8'))
        // 结构版本不匹配时重新生成，避免旧缓存与新逻辑不一致
        if (
          data?.version === IDENTITY_VERSION &&
          data?.identity?.navigator?.userAgent &&
          data?.headers?.['user-agent']
        ) {
          return data
        }
      }
    } catch { /* 忽略，重新生成 */ }
    return null
  }

  #generateAndSave() {
    const env = this.#generate()
    try {
      fs.mkdirSync(path.dirname(this.identityPath), { recursive: true })
      fs.writeFileSync(this.identityPath, JSON.stringify(env, null, 2), 'utf-8')
    } catch { /* 写入失败不影响运行 */ }
    return env
  }

  // ── 核心生成逻辑 ──

  #generate() {
    const osInfo = this.#detectOS()
    const chromeVersion = this.#pickChromeVersion()

    // ── UA（navigator.appVersion 由引擎从 UA 派生，无需单独生成）──
    const ua = `Mozilla/5.0 (${osInfo.platformString}) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${WEBKIT_VERSION}`

    // ── UA-CH 品牌（随 Chrome 主版本变化的 GREASE 值）──
    const { brands, fullVersionList } = this.#buildBrands(chromeVersion)

    return {
      version: IDENTITY_VERSION,
      identity: {
        navigator: {
          // 基础属性
          userAgent: ua,
          platform: osInfo.navigatorPlatform,
          vendor: 'Google Inc.',
          webdriver: false,
          language: 'zh-CN',
          languages: ['zh-CN', 'zh'],
          hardwareConcurrency: 8,
          deviceMemory: 8,
          cookieEnabled: true,
          doNotTrack: null,
          maxTouchPoints: 0,
          onLine: true,
          product: 'Gecko',
          productSub: '20030107',
          appCodeName: 'Mozilla',
          appName: 'Netscape',
          // UA 客户端提示（纯数据字段可 JSON 序列化，供 preload 消费；方法为运行时 API）
          userAgentData: {
            brands,
            fullVersionList,
            mobile: false,
            platform: osInfo.chromePlatformName,
            platformVersion: osInfo.platformVersion,
            architecture: osInfo.architecture,
            bitness: osInfo.bitness,
            wow64: false,
            getBrands() {
              return Promise.resolve(brands)
            },
            getHighEntropyValues(hints) {
              const result = {}
              if (hints.includes('fullVersionList')) result.fullVersionList = fullVersionList
              if (hints.includes('platformVersion')) result.platformVersion = osInfo.platformVersion
              if (hints.includes('platform')) result.platform = osInfo.chromePlatformName
              if (hints.includes('architecture')) result.architecture = osInfo.architecture
              if (hints.includes('model')) result.model = ''
              if (hints.includes('bitness')) result.bitness = osInfo.bitness
              if (hints.includes('uaFullVersion')) result.uaFullVersion = chromeVersion
              if (hints.includes('wow64')) result.wow64 = false
              return Promise.resolve(result)
            },
            toJSON() {
              return { brands, mobile: false, platform: osInfo.chromePlatformName }
            },
          },
          // 插件列表（Chrome 126+ 规范硬编码的 5 个 PDF 插件，HTML spec §8.10.1.6）
          plugins: this.#generatePlugins(),
        },
      },
      headers: {
        'user-agent': ua,
        'sec-ch-ua': brands.map(b => `"${b.brand}";v="${b.version}"`).join(', '),
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': osInfo.chromePlatformName,
        // Windows/macOS 发送 platform-version；Linux 省略（真实 Chrome 默认状态即无此头，
        // 且其高熵值为空串，见 user_agent_utils.cc GetPlatformVersion）
        ...(osInfo.platformVersion
          ? { 'sec-ch-ua-platform-version': `"${osInfo.platformVersion}"` }
          : {}),
      },
    }
  }

  // ── UA-CH 品牌：复刻 Chromium GREASE 算法（seed = 主版本号）──
  #buildBrands(chromeVersion) {
    const major = Number(chromeVersion.split('.')[0])
    const grease = {
      brand: `Not${GREASE_CHARS[major % 11]}A${GREASE_CHARS[(major + 1) % 11]}Brand`,
      version: GREASE_VERSIONS[major % 3],
    }
    // fullVersionList 中 GREASE 版本补 .0.0.0（GetProcessedGreasedBrandVersion）
    const greaseFull = { brand: grease.brand, version: `${grease.version}.0.0.0` }
    const order = BRAND_ORDERS[major % 6]
    const base = [
      grease,
      { brand: 'Chromium', version: String(major) },
      { brand: 'Google Chrome', version: String(major) },
    ]
    const full = [
      greaseFull,
      { brand: 'Chromium', version: chromeVersion },
      { brand: 'Google Chrome', version: chromeVersion },
    ]
    const brands = []
    const fullVersionList = []
    for (let i = 0; i < 3; i++) {
      brands[order[i]] = base[i]
      fullVersionList[order[i]] = full[i]
    }
    return { brands, fullVersionList }
  }

  #pickChromeVersion() {
    // 基于 os.hostname() + os.platform() 的确定性哈希，确保同一台机器版本一致
    const seed = this.#hashCode(os.hostname() + os.platform() + os.arch())
    return CHROME_VERSIONS[seed % CHROME_VERSIONS.length]
  }

  #hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32-bit int
    }
    return Math.abs(hash)
  }

  #detectOS() {
    const platform = os.platform()
    const arch = os.arch()

    if (platform === 'win32') {
      // 现代 Chrome 统一上报 Windows NT 10.0; Win64; x64（Win10/Win11/arm64 相同）
      const isWin11 = Number(os.release().split('.')[2] || 0) >= 22000
      return {
        platform: 'win32',
        arch,
        navigatorPlatform: 'Win32',
        chromePlatformName: 'Windows',
        platformVersion: isWin11 ? '15.0.0' : '14.0.0',
        architecture: arch === 'arm64' ? 'arm' : 'x86',
        bitness: arch === 'ia32' ? '32' : '64',
        platformString: 'Windows NT 10.0; Win64; x64',
      }
    }

    if (platform === 'darwin') {
      // Chrome 在 macOS（含 Apple Silicon）统一上报 Intel Mac OS X 10_15_7
      const darwinMajor = parseInt(os.release().split('.')[0], 10)
      const macosMajor = darwinMajor >= 20 ? darwinMajor - 9 : 10
      const macosMinor = darwinMajor >= 20 ? (parseInt(os.release().split('.')[1], 10) || 0) : 15
      return {
        platform: 'darwin',
        arch,
        navigatorPlatform: 'MacIntel',
        chromePlatformName: 'macOS',
        platformVersion: `${macosMajor}.${macosMinor}.0`,
        architecture: arch === 'arm64' ? 'arm' : 'x86',
        bitness: '64',
        platformString: 'Macintosh; Intel Mac OS X 10_15_7',
      }
    }

    // Linux：统一上报 x86_64，无 platform-version（与真实 Chrome 一致）
    return {
      platform: 'linux',
      arch,
      navigatorPlatform: 'Linux x86_64',
      chromePlatformName: 'Linux',
      platformVersion: '',
      architecture: arch === 'arm64' || arch === 'arm' ? 'arm' : 'x86',
      bitness: '64',
      platformString: 'X11; Linux x86_64',
    }
  }

  #generatePlugins() {
    // Chrome 126+ 规范硬编码的 5 个 PDF 插件（HTML spec §8.10.1.6）
    return [
      'PDF Viewer',
      'Chrome PDF Viewer',
      'Chromium PDF Viewer',
      'Microsoft Edge PDF Viewer',
      'WebKit built-in PDF',
    ].map(name => ({
      name,
      filename: 'internal-pdf-viewer',
      description: 'Portable Document Format',
      mimeTypes: [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
      ],
    }))
  }
}

export default new BrowserEnv()
