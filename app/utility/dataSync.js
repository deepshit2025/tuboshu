import {ipcMain, session} from 'electron'
import tbsDbManager from '../store/tbsDbManager.js'

class DataSync{
    constructor() {}

    getPartitionName(name){
        return 'persist:' + name;
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

    async clearStorageExcludingCookies() {
        const sites = tbsDbManager.getSites();
        const typesToClear = ['appcache', 'filesystem', 'indexdb', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'];

        await Promise.all(sites.map(async (site) => {
            try {
                const partitionSession = session.fromPartition(this.getPartitionName(site.name));
                await partitionSession.clearCache()
                await partitionSession.clearStorageData({ storages: typesToClear });
            } catch (error) {
                console.error(`清除站点 ${site.name} 的数据失败:`, error);
            }
        }));
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
            await this.clearStorageExcludingCookies();
            return true;
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