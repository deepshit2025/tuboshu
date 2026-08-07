import {app} from 'electron'
import path from 'path'
import { URL, fileURLToPath } from 'url'
import requestJson from './request.js'
import CONS from '../constants.js'
import pluginManager from '../pluginManager.js'

const versionUrl = "https://upsort.com/tuboshu";
const getDomain = (url) => {
    try {
        const hostname = new URL(url.toLowerCase()).hostname;
        const parts = hostname.split('.');
        return parts.slice(-2).join('.');
    } catch (error) {
        return null;
    }
}

class Utility {
    constructor() {}
    static isMainDomainEqual (url1, url2) {
        if(url1.toLowerCase().indexOf('upsort') !== -1){
            return false;
        }
        return getDomain(url1) === getDomain(url2);
    }

    static async fetchVersionLatest() {
        try {
            const res = await requestJson({url: versionUrl});
            return res.data;
        } catch {
            return {version: '', download_url: ''};
        }
    }

    static async loadExtensions(view) {
        const sess = view.webContents.session;
        return pluginManager.loadEnabledExtensions(sess)
    }

    static selectAppropriatePreload(url){
        const isHttpAddr = url.toLowerCase().startsWith("http");
        let preloadjs = isHttpAddr ? "web.js" : "setting.js";
        if(url.toLowerCase().includes("http://localhost:")|| url.toLowerCase().includes("http://tuboshu")){
            preloadjs = "setting.js"
        }else if(url.toLowerCase().includes('transfer.html')){
            preloadjs = "transfer.js"
        }
        return path.join(CONS.APP.PATH ,'/resource/preload/', preloadjs)
    }

    static appendJsCode(code) {
        return `(function() {
            try {
                const scriptElement = document.createElement('script');
                scriptElement.textContent = ${code};
                document.head.appendChild(scriptElement);
            } catch (e) {
                console.error('Script injection failed:', e);
            }
        })();`
    }
    static alterRequestHeader(view, headers){
        const session = view.webContents.session;
        // 每个 session 只注册一次，避免重复监听器堆积
        if (session.__headerPatched) return;
        session.__headerPatched = true;

        session.webRequest.onBeforeSendHeaders((details, callback) => {
            // 先移除引擎自动生成的 UA-CH（Electron 默认值可能与伪装身份不一致）
            const h = details.requestHeaders;
            delete h['sec-ch-ua'];
            delete h['sec-ch-ua-mobile'];
            delete h['sec-ch-ua-platform'];
            delete h['sec-ch-ua-platform-version'];
            delete h['sec-ch-ua-full-version-list'];
            // 高熵 UA-CH 仅在站点 Accept-CH 协商后出现，一并移除引擎默认值，避免暴露真实平台信息
            delete h['sec-ch-ua-arch'];
            delete h['sec-ch-ua-bitness'];
            delete h['sec-ch-ua-model'];
            delete h['sec-ch-ua-wow64'];
            // 写入伪装身份，与 browserEnv 完全一致（Linux 无 platform-version，与真实 Chrome 一致）
            h['user-agent'] = headers['user-agent'];
            h['sec-ch-ua'] = headers['sec-ch-ua'];
            h['sec-ch-ua-mobile'] = headers['sec-ch-ua-mobile'];
            h['sec-ch-ua-platform'] = headers['sec-ch-ua-platform'];
            if (headers['sec-ch-ua-platform-version']) {
                h['sec-ch-ua-platform-version'] = headers['sec-ch-ua-platform-version'];
            }
            callback({ requestHeaders: h });
        });
    }

    static alterResponseHeader(view){
        const session = view.webContents.session;
        // 每个 session 只注册一次，避免重复监听器堆积
        if (session.__headerResponsePatched) return;
        session.__headerResponsePatched = true;

        session.webRequest.onHeadersReceived((details, callback) => {
            const cspHeader = {
                name: 'content-security-policy',
                value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"
            };

            const domains = ['yuque.com', 'wx.mail.qq.com'];
            if(domains.some(domain => details.url.toLowerCase().includes(domain))){
                details.responseHeaders[cspHeader.name] = [cspHeader.value];
            }
            callback({ responseHeaders: details.responseHeaders });
        });
    }


    static loadURLWithTimeout(view, url, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                view.webContents.stop();
                reject(new Error("连接超时，请检查网络配置"));
                cleanup();
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timeoutId);
                view.webContents.removeListener('did-finish-load', onLoad);
                view.webContents.removeListener('did-fail-load', onError);
            };

            const onLoad = () => {
                resolve();
                cleanup();
            };

            const onError = (event, errorCode, errorDesc) => {
                reject(new Error(`${errorDesc} (code ${errorCode})`));
                cleanup();
            };

            view.webContents.on('did-finish-load', onLoad);
            view.webContents.on('did-fail-load', onError);

            view.webContents.loadURL(url).catch((err) => {
                reject(err);
                cleanup();
            });
        });
    }

    static async loadWithLoading(view, url, timeout = 10000) {
        if(url.toLowerCase().startsWith('file:')){
            await view.webContents.loadURL(url);
            return;
        }

        await view.webContents.loadFile('gui/loading.html');
        try {
            await Utility.loadURLWithTimeout(view, url, timeout);
        } catch (err) {
            await view.webContents.executeJavaScript(`
              document.querySelector('.loader').style.display = 'none';
              const errorDiv = document.querySelector('.error');
              const reloadDiv = document.querySelector('.reload');
              errorDiv.style.display = 'block';
              errorDiv.textContent = '加载失败: ${err.message}';
              reloadDiv.style.display = 'block';
        `);
        }
    }
}

export default Utility





