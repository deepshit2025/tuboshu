import {ipcMain, session, app} from 'electron'
import path from 'path'
import fs from 'fs/promises'
import tbsDbManager from '../store/tbsDbManager.js'
import viewManager from '../viewManager.js'
import CONS from '../constants.js'

// clearStorageData 支持的存储类型（注意 localstorage 为全小写）
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

// 可安全删除的分区缓存子目录（保留 Network/Cookies、Preferences 等登录相关数据）
const CACHE_SUBDIRS = [
    'Cache',
    'Code Cache',
    'GPUCache',
    'DawnGraphiteCache',
    'DawnWebGPUCache',
    'Service Worker',
    'IndexedDB',
    'Local Storage',
    'Session Storage',
    'WebStorage',
    'Shared Dictionary',
    'blob_storage',
    'File System',
    'WebSQL'
]

// 正在使用的内置页面分区，只做 API 清理，不删除磁盘目录
const BUILTIN_PARTITIONS = new Set([
    ...CONS.SETTING.map(item => item.name),
    CONS.APP.CLOSE_SITE_NAME
])

// 单个清理任务的最长等待时间，避免损坏的分区（如 quota 数据库异常）拖死整个清理
const CLEAR_TASK_TIMEOUT = 8000

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
            ['clearStorageData', () => targetSession.clearStorageData({storages: STORAGE_TYPES})],
            ['clearCache', () => targetSession.clearCache()],
            ['clearCodeCaches', () => targetSession.clearCodeCaches({})],
            ['clearAuthCache', () => targetSession.clearAuthCache()],
            ['clearHostResolverCache', () => targetSession.clearHostResolverCache()],
            ['clearSharedDictionaryCache', () => targetSession.clearSharedDictionaryCache()]
        ];

        // 并行执行，且每个任务都有超时保护：个别分区存储损坏时不会拖死整个清理
        const results = await Promise.all(tasks.map(async ([taskName, task]) => {
            let timer;
            try {
                await Promise.race([
                    task(),
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error(`超时 ${CLEAR_TASK_TIMEOUT}ms`)), CLEAR_TASK_TIMEOUT);
                    })
                ]);
                return null;
            } catch (error) {
                console.error(`[clearCache] ${label}.${taskName} 清理失败:`, error.message || error);
                return taskName;
            } finally {
                clearTimeout(timer);
            }
        }));

        return results.filter(Boolean);
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

    // 磁盘级清理单个分区的缓存子目录（保留 Cookies/Network 等登录数据）
    async purgePartitionCacheDirs(name){
        const partitionDir = path.join(this.getPartitionsDir(), name);
        let removed = 0;
        const failed = [];

        for (const sub of CACHE_SUBDIRS) {
            const target = path.join(partitionDir, sub);

            try {
                const stat = await fs.stat(target);
                if (!stat.isDirectory()) continue;
            } catch (error) {
                if (error.code === 'ENOENT') continue;
                failed.push(sub);
                continue;
            }

            try {
                // 不重试：运行时被 session 锁住的目录快速失败，留给下次启动清理
                await fs.rm(target, {recursive: true, force: true, maxRetries: 0});
                removed++;
            } catch (error) {
                failed.push(sub);
                console.error(`[clearCache] 删除分区 ${name}/${sub} 失败:`, error.message || error);
            }
        }

        return {removed, failed};
    }

    getPendingCleanupFile(){
        return path.join(app.getPath('userData'), 'cache-cleanup-pending.json');
    }

    async savePendingCleanup(names){
        const file = this.getPendingCleanupFile();

        try {
            if (!names || names.length === 0) {
                await fs.rm(file, {force: true});
                return;
            }
            await fs.writeFile(file, JSON.stringify({
                partitions: [...new Set(names)],
                updatedAt: Date.now()
            }), 'utf8');
        } catch (error) {
            console.error('[clearCache] 写入待清理标记失败:', error.message || error);
        }
    }

    // 应用启动时执行上次未完成的磁盘清理（此时没有站点视图占用文件）
    async processPendingCleanup(){
        const file = this.getPendingCleanupFile();
        let data;

        try {
            data = JSON.parse(await fs.readFile(file, 'utf8'));
        } catch (error) {
            return {processed: 0, pending: 0};
        }

        const partitions = Array.isArray(data?.partitions) ? data.partitions : [];
        const stillPending = [];
        let processed = 0;

        for (const name of partitions) {
            const {failed} = await this.purgePartitionCacheDirs(name);
            if (failed.length > 0) stillPending.push(name);
            else processed++;
        }

        await this.savePendingCleanup(stillPending);

        if (processed > 0 || stillPending.length > 0) {
            console.log(`[clearCache] 启动清理：完成 ${processed} 个，待重试 ${stillPending.length} 个`);
        }

        return {processed, pending: stillPending.length};
    }

    async clearStorageExcludingCookies() {
        const activeView = viewManager.getActiveView();

        // 先关闭非活动视图，避免页面内存中的缓存/存储在清理后重新写回磁盘
        const viewsClosed = viewManager.closeInactiveViews(activeView?.name);

        const {sessions, labels} = this.getTargetSessions();
        const apiFailed = [];
        await Promise.all(sessions.map(async (targetSession, index) => {
            const failedTasks = await this.clearSession(targetSession, labels[index]);
            if (failedTasks.length > 0) apiFailed.push(labels[index]);
        }));

        // 磁盘级兜底：API 清理不到或存储损坏导致超时的分区，直接删除缓存目录
        const pending = [];
        let dirsRemoved = 0;
        let dirsFailed = 0;

        const partitionNames = this.getTargetPartitionNames()
            .filter(name => !BUILTIN_PARTITIONS.has(name));
        const dirResults = await Promise.all(partitionNames.map(async name => {
            const result = await this.purgePartitionCacheDirs(name);
            return {name, ...result};
        }));

        for (const result of dirResults) {
            dirsRemoved += result.removed;
            dirsFailed += result.failed.length;
            if (result.failed.length > 0) pending.push(result.name);
        }

        // 仍有文件被占用时记录标记，下次启动时继续清理
        await this.savePendingCleanup(pending);

        // 同时清理已删除站点遗留的整个分区目录
        const orphans = await this.purgeOrphanPartitions();

        return {
            sessions: sessions.length,
            viewsClosed,
            apiFailed: apiFailed.length,
            dirsRemoved,
            dirsFailed,
            pending: pending.length,
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