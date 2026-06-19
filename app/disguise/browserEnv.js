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

class BrowserEnv {
  constructor() {
    this.identityPath = null
    this.env = null
  }

  // ── 公开接口 ──

  /** 供 preload 使用的完整身份对象 */
  getIdentity() {
    this.#ensure()
    return this.env.identity
  }

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
        const raw = fs.readFileSync(this.identityPath, 'utf-8')
        const data = JSON.parse(raw)
        // 基本校验
        if (data?.identity?.navigator?.userAgent && data?.headers?.['user-agent']) {
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
    const chromeMajor = chromeVersion.split('.')[0]

    // ── 平台字符串 ──
    const platformStr = this.#buildPlatformString(osInfo)
    // ── UA ──
    const webkitVer = '537.36'
    const ua = `Mozilla/5.0 (${platformStr}) AppleWebKit/${webkitVer} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVer}`
    const appVersion = `5.0 (${platformStr}) AppleWebKit/${webkitVer} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVer}`

    // ── Sec-CH-UA 品牌 ──
    const brands = [
      { brand: 'Google Chrome', version: chromeMajor },
      { brand: 'Chromium', version: chromeMajor },
      { brand: 'Not=A?Brand', version: '99' },
    ]
    const fullVersionList = [
      { brand: 'Google Chrome', version: chromeVersion },
      { brand: 'Chromium', version: chromeVersion },
      { brand: 'Not=A?Brand', version: '99' },
    ]

    return {
      identity: {
        navigator: {
          // 基础属性
          userAgent: ua,
          appVersion: appVersion,
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
          // UA 客户端提示
          userAgentData: {
            brands,
            mobile: false,
            platform: osInfo.chromePlatformName,
            platformVersion: osInfo.platformVersion,
            architecture: osInfo.architecture,
            bitness: osInfo.bitness,
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
          // 插件列表（供 preload 构建 PluginArray 用）
          plugins: this.#generatePlugins(),
        },
      },
      headers: {
        'user-agent': ua,
        'sec-ch-ua': brands.map(b => `"${b.brand}";v="${b.version}"`).join(', '),
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': osInfo.chromePlatformName,
        'sec-ch-ua-platform-version': `"${osInfo.platformVersion}"` || '"0.0.0"',
      },
    }
  }

  #pickChromeVersion() {
    // 基于 os.hostname() + os.platform() 的确定性哈希，确保同一台机器版本一致
    // 但如果 identity.json 已存在则直接读取（在 #ensure 中处理）
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
    const release = os.release()

    if (platform === 'win32') {
      const [major, minor, build] = release.split('.').map(Number)
      const isWin11 = build >= 22000
      const archMap = { x64: 'x64', arm64: 'ARM64', ia32: 'WOW64' }
      const archStr = archMap[arch] || 'x64'

      return {
        platform: 'win32',
        arch,
        navigatorPlatform: 'Win32',
        chromePlatformName: 'Windows',
        platformVersion: isWin11 ? '15.0.0' : '14.0.0',
        architecture: arch === 'arm64' ? 'arm' : 'x86',
        bitness: arch === 'ia32' ? '32' : '64',
        platformString: isWin11
          ? `Windows NT 10.0; Win64; ${archStr}`
          : `Windows NT ${major}.${minor}; ${archStr}`,
      }
    }

    if (platform === 'darwin') {
      const darwinVer = parseInt(release.split('.')[0], 10)
      const macosMajor = Math.max(darwinVer - 4, 10)
      // 构建 macOS 版本字符串 (如 14.1.0)
      const parts = release.split('.')
      let macosVer = `${macosMajor}`
      if (parts.length > 1) {
        // Darwin 第二段在某些版本对应 macOS 副版本
        macosVer = `${macosMajor}.${parts[1]}`
      }
      const chipType = arch === 'arm64' ? 'Apple Silicon' : 'Intel'

      return {
        platform: 'darwin',
        arch,
        navigatorPlatform: 'MacIntel',
        chromePlatformName: 'macOS',
        platformVersion: macosVer,
        architecture: arch === 'arm64' ? 'arm' : 'x86',
        bitness: '64',
        platformString: `${chipType} Mac OS X ${macosVer.replace('.', '_')}`,
      }
    }

    // Linux
    const archMap = {
      x64: 'x86_64', arm: 'armv7l', arm64: 'aarch64',
      ppc64: 'ppc64le', s390x: 's390x',
    }
    return {
      platform: 'linux',
      arch,
      navigatorPlatform: `Linux ${archMap[arch] || 'x86_64'}`,
      chromePlatformName: 'Linux',
      platformVersion: '',
      architecture: arch === 'arm64' ? 'arm' : 'x86',
      bitness: '64',
      platformString: `X11; Linux ${archMap[arch] || 'x86_64'}`,
    }
  }

  #buildPlatformString(osInfo) {
    return osInfo.platformString
  }

  #generatePlugins() {
    // 真实 Chrome 默认插件列表
    return [
      {
        name: 'Chrome PDF Plugin',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format',
        mimeTypes: [
          { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        ],
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        description: '',
        mimeTypes: [
          { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        ],
      },
      {
        name: 'Native Client',
        filename: 'internal-nacl-plugin',
        description: '',
        mimeTypes: [
          { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' },
          { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
        ],
      },
    ]
  }
}

export default new BrowserEnv()
