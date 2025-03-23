const Conf = require('conf');
const CONS = require('./../constants')
const {app} = require("electron");

class StoreManager{
    constructor() {
        this.store = new Conf({cwd:app.getPath('userData')});
    }

    get(key) {
        return this.store.get(key);
    }

    set(key, value) {
        this.store.set(key, value);
    }

    getSettings(){
        return Object.keys(CONS.CONFIG).map(key => {
            return {name : key, value : this.getSetting(key)}
        })
    }

    getSetting(key){
        if(this.store.has(key)){
            return this.store.get(key);
        }
        return CONS.CONFIG[key]
    }

    updateSetting(setting){
        return this.store.set(setting.name, setting.value);
    }
}

module.exports = new StoreManager()