import {WebContentsView, session, shell} from 'electron'
import eventManager from './eventManager.js'
import tbsDbManager from './store/tbsDbManager.js'
import fingerPrint from "./disguise/fingerPrint.js";
import storeManager from "./store/storeManager.js";
import CONS from './constants.js'
import Utility from "./utility/utility.js";

class ViewManager {
    constructor() {
        this.views = [];
        this.parentView = null;
    }

    setParentView(view) {
        this.parentView = view;
    }

    addView(item) {
        return this.views.push(item);
    }

    isExist(name) {
        return (this.views.findIndex(item => item.name === name.toLowerCase()) !== -1)
    }

    closeView(name) {
        const index = this.views.findIndex(view =>
            view.name === name.toLowerCase()
        );
        if (index === -1) return false;

        const closedView = this.views.splice(index, 1)[0];
        this.clearView(closedView)

        return true;
    }

    clearView(view){
        if (view.object) {
            this.parentView?.removeChildView(view.object);
            if (view.object.webContents?.isDestroyed !== true){
                view.object.webContents.removeAllListeners();
                view.object.webContents.close()
            }
        }
        view.object = null;
    }


    refreshActiveView(){
        const activeView = this.getActiveView();
        //if(!activeView.url.toLowerCase().startsWith("http")) return;
        Utility.loadWithLoading(activeView.object, activeView.url).then(()=>{
            eventManager.emit('set:title', activeView.object.webContents.getTitle());
        }).catch((error)=>{
            console.log('error', error);
            setTimeout(()=> this.refreshActiveView(), 1000)
        })
    }

    getActiveView() {
        return this.views.find(view => view.object.getVisible());
    }

    activeView(name) {
        const timestamp = Date.now();
        for (let i = 0; i < this.views.length; i++) {
            if (this.views[i].name === name.toLowerCase()) {
                this.views[i].time = timestamp;
                this.views[i].object.setVisible(true)
                this.views[i].object.webContents.focus();
                eventManager.emit('set:title', this.views[i].object.webContents.getTitle());
            }else{
                this.views[i].object.setVisible(false)
            }
        }
    }

    createView(url, name, source) {
        const {fingerprint, headers} = fingerPrint.getFinger();
        const partitionName = 'persist:' + name;
        const mySession = session.fromPartition(partitionName);

        const isHttpAddr = url.toLowerCase().startsWith("http");
        const preloadjs = Utility.selectAppropriatePreload(url);

        const unique = Date.now();
        const args = {source, name, unique, fingerprint};

        const view = new WebContentsView({
            webPreferences: {
                sandbox: true,
                webSecurity: true,
                nodeIntegration: false,
                contextIsolation: true,
                dnsPrefetch: false,
                partition: partitionName,
                preload: preloadjs,
                additionalArguments: [`--params=${JSON.stringify(args)}`]
            }
        })

        if(isHttpAddr){
            Utility.alterRequestHeader(view, headers)
            Utility.alterResponseHeader(view)
            Utility.loadExtensions(view).finally()
        }

        view.webContents.setZoomLevel(0)
        this.renderProcessGone(view);
        this.injectJsCode(view, name);
        this.setProxy(mySession, name)

        Utility.loadWithLoading(view, url).then(()=>{
            eventManager.emit('set:title', view.webContents.getTitle());
        })

        if(storeManager.getSetting('isOpenDevTools')){
            view.webContents.openDevTools({mode: 'right',activate: true})
        }

        view.webContents.setWindowOpenHandler((details) => {
            if(Utility.isMainDomainEqual(details.url, url)){
                view.webContents.send('open:window', details.url)
                return { action: 'deny' };
            }

            if(storeManager.getSetting('howLinkOpenMethod') === "tuboshu"){
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {autoHideMenuBar: true}
                };
            }

            shell.openExternal(details.url).finally();
            return { action: 'deny' };
        })

        const viewItem = {
            name: name.toLowerCase(),
            url: url.toLowerCase(),
            time: unique,
            unique:unique,
            object: view
        }

        this.views.forEach(view => view.object.setVisible(false))
        this.addView(viewItem)
        eventManager.emit('layout:resize', {view: viewItem});

        return viewItem;
    }

    createMultiView(url, name) {
        return this.createView(url, name, CONS.APP.VIEW_TYPE.MULTI)
    }
    createNewView(url, name) {
        if (this.isExist(name)) {
            const activeView = this.getActiveView();
            this.activeView(name);

            if(activeView?.name === name || CONS.APP.CLOSE_SITE_NAME === name){
                this.refreshActiveView();
                return true;
            }
            return true;
        }
        this.createView(url, name, CONS.APP.VIEW_TYPE.SINGLE)
    }

    injectJsCode(view, name){
        view.webContents.on('dom-ready',async ()=>{
            
            const site = tbsDbManager.getSite(name);
            if(site && Object.hasOwn(site,'jsCode') && site.jsCode.length > 0){
                const code = Utility.appendJsCode(JSON.stringify(site.jsCode))
                await view.webContents.executeJavaScript(code);
            }
        })
    }

    setProxy(mySession, name) {
        const site = tbsDbManager.getSite(name);
        if(site && Object.hasOwn(site,'proxy') && site.proxy.length > 10){
            mySession.setProxy({proxyRules: site.proxy,});
        }
    }

    renderProcessGone(view){
        view.webContents.on('render-process-gone', (event, details) => {
            console.error('The rendering process has crashed:', details.reason);
            if (!view.webContents.isDestroyed()) view.webContents.reload();
        });
    }
}

export default new ViewManager();