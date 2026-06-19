import { readdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'

export default async function afterPack(context) {
  const { appOutDir, electronPlatformName } = context

  // 仅 Windows 需要清理 WebGPU DLL
  if (electronPlatformName === 'win32') {
    // 1. 清理多余语言包，只保留 zh-CN + en-US
    const localesDir = join(appOutDir, 'locales')
    if (existsSync(localesDir)) {
      const keep = new Set(['zh-CN.pak', 'en-US.pak'])
      for (const file of readdirSync(localesDir)) {
        if (!keep.has(file)) {
          rmSync(join(localesDir, file))
        }
      }
    }

    // 2. 删除未使用的 WebGPU DLL
    const unusedDlls = ['dxcompiler.dll', 'dxil.dll']
    for (const dll of unusedDlls) {
      const dllPath = join(appOutDir, dll)
      if (existsSync(dllPath)) {
        rmSync(dllPath)
      }
    }
  }
}
