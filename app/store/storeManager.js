// import {app} from "electron"
 // import Conf from 'conf'
import tbsDbManager from './tbsDbManager.js'
import CONS from './../constants.js'

class StoreManager{
    constructor() {
        this.store = tbsDbManager;
    }

    get(key) {
        return this.store.getSetting(key);
    }

    set(key, value) {
        this.store.addSetting(key, value);
    }

    getSettings(){
        return Object.keys(CONS.CONFIG).map(key => {
            return {name : key, value : this.getSetting(key)}
        })
    }

    getSetting(key){
        let val;
        if(this.store.hasSetting(key)){
            val = this.store.getSetting(key);
        }else{
            val = CONS.CONFIG[key]
        }
        // 数字 0/1 → boolean
        if (typeof val === 'number' && (val === 0 || val === 1)) {
            return !!val;
        }
        return val;
    }

    updateSetting(setting){
        return this.store.updateSetting(setting.name, setting.value);
    }
}

export default new StoreManager()