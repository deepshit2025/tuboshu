import {app} from 'electron'
import path from 'path'
import { readdir } from 'fs/promises';
import { URL, fileURLToPath } from 'url'
import requestJson from './request.js'
import CONS from '../constants.js'

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
        const res =  await requestJson({url:versionUrl})
        return res.data;
    }

    static async loadExtensions(view) {
        const sess = view.webContents.session;

        const extensionsDir = app.isPackaged
            ? path.join(process.resourcesPath, 'plugin')
            : path.join(CONS.APP.PATH, './resource/plugin');
        const entries = await readdir(extensionsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory() || !entry.name.endsWith('.ext')) continue;
            const extPath = path.join(extensionsDir, entry.name);
            try {
                await sess.extensions.loadExtension(extPath);
                console.log(`Successfully loaded extension: ${extPath}`);
            } catch (err) {
                console.error(`Failed to load extension ${extPath}:`, err);
            }
        }
        return true;
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
        session.webRequest.onBeforeSendHeaders((details, callback) => {
            const domains = ['google'];
            if(domains.some(domain => details.url.toLowerCase().includes(domain))){
                callback({ requestHeaders: details.requestHeaders});
                return;
            }
            details.requestHeaders['user-agent'] = headers['user-agent'];
            details.requestHeaders['sec-ch-ua'] = headers['sec-ch-ua'];
            // details.requestHeaders['upgrade-insecure-requests'] = headers['upgrade-insecure-requests'];
            // details.requestHeaders[' accept'] = headers[' accept'];
            callback({ requestHeaders: details.requestHeaders });
            //callback({ requestHeaders: Object.assign(details.requestHeaders, headers)});
        });
    }

    static alterResponseHeader(view){
        const session = view.webContents.session;
        session.webRequest.onHeadersReceived((details, callback) => {
            const cspHeader = {
                name: 'content-security-policy',
                value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:"
            };

            const domains = ['yuque.com', 'wx.mail.qq.com'];
            if(domains.some(domain => details.url.toLowerCase().includes(domain))){
                details.responseHeaders[cspHeader.name] = cspHeader.value;
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





