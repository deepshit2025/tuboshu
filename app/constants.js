import path from 'path'
import { fileURLToPath } from 'url';
import {app} from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname =  path.dirname(__filename);

const SETTING_URL = app.isPackaged
    ? `file://${path.join(__dirname, '..', 'gui/dist/index.html')}`
    : 'http://localhost:5173/';

export default Object.freeze({
    SIZE: {
        HEIGHT:768,
        WIDTH: 1024,
        MENU_WIDTH: 50
    },
    CONFIG: {
        defaultWindowSize : {
            width: 1024,
            height: 768,
        },
        defaultMenuWidth: 50,
        leftMenuPosition:'left',
        isWindowEdgeAdsorption: 1,
        isMemoryOptimizationEnabled:1,
        isMenuVisible:1,
        isOpenDevTools:0,
        isOpenZoom:1,
        systemTheme:'system'
    },

    PATH: {
        APP_PATH: path.join(__dirname, '..'),
    },
    PREVIEW_IMG: "/gui/static/images/logo/preview_default.png",
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
            tag:  "纳米搜索",
            name: "nami",
            url: "https://bot.n.cn/",
            img: "/gui/static/images/logo/nami.png",
            isOpen:true,
            order: 4,
        },
        {
            tag:  "月之暗面",
            name: "kimi",
            url: "https://kimi.moonshot.cn",
            img: "/gui/static/images/logo/kimi.png",
            isOpen:true,
            order: 5,
        },
        {
            tag:"通义千问",
            name: "alibaba",
            url: "https://tongyi.aliyun.com/qianwen",
            img: "/gui/static/images/logo/tongyi.png",
            isOpen:true,
            order: 6,
        },
        {
            tag: "文心一言",
            name: "baidu",
            url: "https://yiyan.baidu.com",
            img: "/gui/static/images/logo/baidu.png",
            isOpen:true,
            order: 7,
        },
        {
            tag: "阿里千问",
            name: "qianwen",
            url: "https://chat.qwen.ai",
            img: "/gui/static/images/logo/qianwen.png",
            isOpen:false,
            order: 8,
        },
        {
            tag:"智谱清言",
            name: "qingyan",
            url: "https://chatglm.cn",
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
        },
        {
            tag: "Midjourney",
            name: "midjourney",
            url: "https://www.midjourney.com",
            img: "/gui/static/images/logo/midjourney.png",
            isOpen:false,
            order: 12,
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
            tag: "反向切换站点",
            name: "softwareSiteReverseSwitch",
            cmd: "CommandOrControl+Shift+Tab",
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
            tag: "反向切换分组",
            name: "groupSiteReverseSwitch",
            cmd: "CommandOrControl+Shift+`",
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