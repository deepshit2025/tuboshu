import {ipcMain, session, app} from 'electron'
import path from 'path'
import fs from 'fs/promises'
import tbsDbManager from '../store/tbsDbManager.js'
import viewManager from '../viewManager.js'
import CONS from '../constants.js'

// Chromium BrowsingDataRemover 支持的数据类型（不含 cookies，保留登录态）
const CACHE_DATA_TYPES = [
    'backgroundFetch',
    'cache',
    'fileSystems',
    'indexedDB',
    'localStorage',
    'serviceWorkers',
    'webSQL'
]

// clearStorageData 兜底清理的存储类型（注意 localstorage 为全小写）
const STORAGE_TYPES = [
    'appcache',
    'filesystem',
    'indexdb',
    'localstorage',
    'shadercache',
    'websql',
    'serviceworkers',
    'cachestorage'
]

class DataSync{
    constructor() {}

    getPartitionName(name){
        return 'persist:' + name;
    }

    // 需要清理的所有分区：数据库中的站点 + 内置页面（设置页、关闭提示页）
    getTargetPartitionNames(){
        const sites = tbsDbManager.getSites();
        const siteNames = sites.length > 0
            ? sites.map(site => site.name)
            : CONS.SITES.map(site => site.name);
        const builtinNames = CONS.SETTING.map(item => item.name);
        builtinNames.push(CONS.APP.CLOSE_SITE_NAME);
        return [...new Set([...siteNames, ...builtinNames])];
    }

    getTargetSessions(){
        const names = this.getTargetPartitionNames();
        const sessions = names.map(name => session.fromPartition(this.getPartitionName(name)));
        // 菜单页等使用默认 session，同样需要清理
        sessions.push(session.defaultSession);
        return {sessions, labels: [...names, 'default']};
    }

    async clearSession(targetSession, label){
        const tasks = [
            ['clearData', () => targetSession.clearData({dataTypes: CACHE_DATA_TYPES})],
            ['clearCache', () => targetSession.clearCache()],
            ['clearCodeCaches', () => targetSession.clearCodeCaches({})],
            ['clearStorageData', () => targetSession.clearStorageData({storages: STORAGE_TYPES})],
            ['clearAuthCache', () => targetSession.clearAuthCache()],
            ['clearHostResolverCache', () => targetSession.clearHostResolverCache()],
            ['clearSharedDictionaryCache', () => targetSession.clearSharedDictionaryCache()]
        ];

        for (const [taskName, task] of tasks) {
            try {
                await task();
            } catch (error) {
                console.error(`[clearCache] ${label}.${taskName} 清理失败:`, error);
            }
        }
    }

    async getAllSiteCookies(){
        const sites = tbsDbManager.getSites()
        const openSites = sites.filter(site => site.isOpen);

        const cookiesPromises = openSites.map(async (site) => {
            try {
                const partitionName = this.getPartitionName(site.name);
                const partitionSession = session.fromPartition(partitionName);
                const cookies = await partitionSession.cookies.get({});
                return {
                    name: site.name,
                    cookies: cookies
                };
            } catch (error) {
                throw error;
            }
        })

        const allResults = await Promise.allSettled(cookiesPromises);
        const hasCookiesSites = allResults.filter(result => result.status === 'fulfilled').map(result => result.value);
        return  hasCookiesSites.filter(item => item.cookies.length > 0)
    }

    async restoreAllSiteCookies(cookiesData) {
        for (const siteData of cookiesData) {
            try {
                const siteName = siteData.name;
                const cookies = siteData.cookies;
                const partitionSession = session.fromPartition(this.getPartitionName(siteName));

                const setCookiePromises = cookies.map(async (cookie) => {
                    const cookieDetails = {
                        url: `https://${cookie.domain}${cookie.path}`,
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        sameSite: cookie.sameSite,
                        expirationDate: cookie.expirationDate
                    };
                    Object.keys(cookieDetails).forEach(key => cookieDetails[key] === undefined && delete cookieDetails[key]);
                    return partitionSession.cookies.set(cookieDetails);
                });
                await Promise.all(setCookiePromises);
            } catch (error) {
                console.error(`Restoring cookies for site ${siteData.name} failed:`, error);
            }
        }
    }

    getPartitionsDir(){
        return path.join(app.getPath('userData'), 'Partitions');
    }

    // 删除数据库中已不存在的站点遗留的分区目录（应用删除站点后残留的缓存/登录数据）
    async purgeOrphanPartitions(){
        const partitionsDir = this.getPartitionsDir();
        let entries;

        try {
            entries = await fs.readdir(partitionsDir, {withFileTypes: true});
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('[clearCache] 读取 Partitions 目录失败:', error);
            }
            return {removed: 0, failed: 0};
        }

        const keep = new Set(this.getTargetPartitionNames());
        let removed = 0;
        let failed = 0;

        for (const entry of entries) {
            if (!entry.isDirectory() || keep.has(entry.name)) continue;

            try {
                await fs.rm(path.join(partitionsDir, entry.name), {
                    recursive: true,
                    force: true,
                    maxRetries: 3,
                    retryDelay: 200
                });
                removed++;
            } catch (error) {
                failed++;
                console.error(`[clearCache] 删除遗留分区目录 ${entry.name} 失败:`, error);
            }
        }

        if (removed > 0 || failed > 0) {
            console.log(`[clearCache] 遗留分区目录清理完成：删除 ${removed} 个，失败 ${failed} 个`);
        }

        return {removed, failed};
    }

    // 删除指定站点的分区目录（删除站点时调用，调用前应先关闭对应视图）
    async purgePartitionDir(name){
        if (!name) return false;

        try {
            await fs.rm(path.join(this.getPartitionsDir(), name), {
                recursive: true,
                force: true,
                maxRetries: 3,
                retryDelay: 200
            });
            return true;
        } catch (error) {
            console.error(`[clearCache] 删除站点分区目录 ${name} 失败:`, error);
            return false;
        }
    }

    async clearStorageExcludingCookies() {
        const activeView = viewManager.getActiveView();

        // 先关闭非活动视图，避免页面内存中的缓存/存储在清理后重新写回磁盘
        const viewsClosed = viewManager.closeInactiveViews(activeView?.name);

        const {sessions, labels} = this.getTargetSessions();
        await Promise.all(sessions.map((targetSession, index) => this.clearSession(targetSession, labels[index])));

        // 当前页面（通常是设置页）在清理完成后重新加载
        const webContents = activeView?.object?.webContents;
        if (webContents && !webContents.isDestroyed()) {
            webContents.reload();
        }

        // 同时清理已删除站点遗留的分区目录
        const orphans = await this.purgeOrphanPartitions();

        return {
            sessions: sessions.length,
            viewsClosed,
            orphansRemoved: orphans.removed,
            orphansFailed: orphans.failed
        };
    }

    bindIpcMain() {
        //获取cookies和配置
        ipcMain.handle('dataSync:get:data', async () => {
            const cookies = await this.getAllSiteCookies()
            const config = tbsDbManager.getAllConfigData()
            return {cookies, config}
        })

        //清理缓存
        ipcMain.handle('dataSync:clear:cache', async () => {
            return await this.clearStorageExcludingCookies();
        });

        //写入本地数据
        ipcMain.on('dataSync:restore:data', async (event, data) => {
            const {config, cookies} = JSON.parse(data)
            tbsDbManager.restoreAllConfigData(config)
            await this.restoreAllSiteCookies(cookies)
            return true;
        });
    }
}

export default new DataSync();