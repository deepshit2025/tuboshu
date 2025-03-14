const { WebContentsView} = require('electron')
const eventManager = require('./eventManager');
const CONS = require('./constants');

class ViewManager {
    constructor() {
        this.views = [];
    }
    addView(view) {
        this.views.push(view);
    }

    isExist(name) {
        for (let i = 0; i < this.views.length; i++) {
            if (this.views[i].name === name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    getActiveView() {
        return this.views.find(view => view.object.getVisible());
    }

    activeView(name) {
        const timestamp = Math.floor(Date.now() / 1000);
        for (let i = 0; i < this.views.length; i++) {
            if (this.views[i].name === name.toLowerCase()) {
                this.views[i].time = timestamp;
                this.views[i].object.setVisible(true)
                eventManager.emit('set:title', this.views[i].object.webContents.getTitle());
            }else{
                this.views[i].object.setVisible(false)
            }
        }
    }

    createNewView(url, name) {
        if (this.isExist(name)) {
            this.activeView(name)
            return null;
        }

        let view = new WebContentsView({
            webPreferences: {
                partition: 'persist:'+name,
                nodeIntegration: false,
                contextIsolation: true,
                preload: CONS.PATH.APP_PATH + '/app/preloadUrl.js'
            }})

        if(url.startsWith("gui/")){
            view.webContents.loadFile(url).then(() => {
                eventManager.emit('set:title', view.webContents.getTitle());
            })
        }else{
            view.webContents.loadURL(url).then(()=>{
                eventManager.emit('set:title', view.webContents.getTitle());
            }).catch(e => {
                view.webContents.loadFile("gui/error.html").then(r => {})
            })
        }

        //view.webContents.openDevTools();
        view.webContents.setWindowOpenHandler(({ url }) => {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {autoHideMenuBar:true}
            }
        })

        this.addView({
            name: name,
            url: url.toLowerCase(),
            time: Math.floor(Date.now() / 1000),
            object: view
        })
        return view
    }
}

module.exports = new ViewManager();