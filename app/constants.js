import path from 'path'
import { fileURLToPath } from 'url';
import {app} from "electron";

const ___filename = fileURLToPath(import.meta.url);
const ___dirname =  path.dirname(___filename);

const appPath = path.join(___dirname, '..');
// const SETTING_URL = app.isPackaged
//     ? `file://${path.join(appPath, 'gui/dist/index.html')}`
//     : 'http://localhost:5173/';
const SETTING_URL = app.isPackaged
    ? `file://${path.join(appPath, 'gui/dist/index.html')}#/set`
    : 'http://localhost:5173/';

export default Object.freeze({
    APP:{
        PATH: appPath,
        PREVIEW_IMG: "/gui/static/images/logo/preview_default.png",
        CLOSE_SITE_NAME :'close_site_url',
        CLOSE_SITE_URL :'file://' + path.join(appPath,'/gui/transfer.html'),
        VIEW_TYPE :{
            SINGLE:'single',
            MULTI:'multiple'
        }
    },
    CONFIG: {
        defaultWindowSize : {
            width: 1024,
            height: 768,
        },
        isFullScreen: 0,
        defaultMenuWidth: 50,
        isMemoryOptimizationEnabled:1,
        isMenuVisible:1,
        isOpenDevTools:0,
        isOpenZoom:1,
        isOpenContextMenu:1,
        isAutoLaunch:0,
        leftMenuPosition:'left',
        systemTheme:'system',
        howLinkOpenMethod:"tuboshu"
    },

    SETTING:[
        {
            tag: "设置",
            name: "setting",
            url: SETTING_URL,
            img: "/gui/static/images/logo/setting.png",
        },
    ],
    SITES:[
        {
            tag: "腾讯元宝",
            name: "yuanbao",
            url: "https://yuanbao.tencent.com",
            img: "/gui/static/images/logo/yuanbao.png",
            isOpen:true,
            order:1,
        },
        {
            tag: "深度求索",
            name: "deepseek",
            url: "https://chat.deepseek.com/",
            img: "/gui/static/images/logo/deepseek.png",
            isOpen:true,
            order: 2,
        },
        {
            tag:  "字节豆包",
            name: "doubao",
            url: "https://www.doubao.com",
            img: "/gui/static/images/logo/doubao.png",
            isOpen:true,
            order: 3,
        },
        {
            tag:  "KIMI",
            name: "kimi",
            url: "https://www.kimi.com/",
            img: "/gui/static/images/logo/kimi.png",
            isOpen:true,
            order: 5,
        },
        {
            tag:"千问",
            name: "qianwen",
            url: "https://www.qianwen.com/",
            img: "/gui/static/images/logo/qianwen.png",
            isOpen:true,
            order: 6,
        },
        {
            tag:"智谱",
            name: "qingyan",
            url: "https://chat.z.ai/",
            img: "/gui/static/images/logo/qingyan.png",
            isOpen:false,
            order: 9,
        },
        {
            tag:  "ChatGPT",
            name: "chatgpt",
            url: "https://chatgpt.com",
            img: "/gui/static/images/logo/chatgpt.png",
            isOpen:false,
            order: 10,
        },
        {
            tag:"Gemini",
            name: "gemini",
            url: "https://gemini.google.com",
            img: "/gui/static/images/logo/gemini.png",
            isOpen:false,
            order: 11,
        }
    ],
    SHORTCUT:[
        {
            tag:  "退出软件",
            name: "softwareExit",
            cmd: "CommandOrControl+Q",
            isGlobal:true,
            isOpen:true,
        },
        {
            tag: "隐藏/显示 软件窗口",
            name: "softwareWindowVisibilityController",
            cmd: "CommandOrControl+H",
            isGlobal:true,
            isOpen:true,
        },
        {
            tag: "隐藏/显示 侧边导航",
            name: "isMenuVisible",
            cmd: "CommandOrControl+B",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "打开设置",
            name: "softwareSetting",
            cmd: "CommandOrControl+S",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "切换站点",
            name: "softwareSiteSwitch",
            cmd: "CommandOrControl+Tab",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "切换分组",
            name: "groupSiteSwitch",
            cmd: "CommandOrControl+`",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "取消/设置 窗口置顶",
            name: "windowTopmostToggle",
            cmd: "CommandOrControl+T",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "恢复默认窗口",
            name: "restoreDefaultWindow",
            cmd: "CommandOrControl+O",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "刷新当前页面",
            name: "currentPageRefresher",
            cmd: "CommandOrControl+R",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "获取当前页URL",
            name: "getCurrentPageUrl",
            cmd: "CommandOrControl+Shift+L",
            isGlobal:false,
            isOpen:false,
        },
        {
            tag: "最小化窗口",
            name: "windowMinimize",
            cmd: "CommandOrControl+[",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "最大化窗口",
            name: "windowMaximizer",
            cmd: "CommandOrControl+]",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "屏幕左边小窗",
            name: "leftScreenMiniWindow",
            cmd: "CommandOrControl+Left",
            isGlobal:false,
            isOpen:true,
        },
        {
            tag: "屏幕右边小窗",
            name: "rightScreenMiniWindow",
            cmd: "CommandOrControl+Right",
            isGlobal:false,
            isOpen:true,
        }
    ]
});