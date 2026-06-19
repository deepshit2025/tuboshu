const { contextBridge, ipcRenderer, webFrame}  = require('electron');

const paramEntry = process.argv.find(item => item.startsWith('--params='));
const context = JSON.parse(paramEntry.substring(paramEntry.indexOf('=') + 1));
const fingerPrint = context.fingerprint;

(async ()=>{
    await webFrame.executeJavaScript(`
        Object.defineProperties(navigator,  {
            webdriver: {get:()=> ${fingerPrint.navigator.webdriver}},
            appVersion: {get:()=> "${fingerPrint.navigator.appVersion}"},
            userAgent: {get:()=> "${fingerPrint.navigator.userAgent}"},
            userAgentData: {get:()=> (${JSON.stringify(fingerPrint.navigator.userAgentData)})},
            languages: {get:()=> ${JSON.stringify(fingerPrint.navigator.languages)}},
            platform: {get:()=> "${fingerPrint.navigator.platform}"}
        });
    `)
})()

contextBridge.exposeInMainWorld('myApi', {
    refreshSelf:() => ipcRenderer.invoke('refresh:self')
})

ipcRenderer.on('open:window', (event, url) => {
    window.location.href = url;
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selectionText = window.getSelection().toString().trim();
    const data = {x: e.clientX, y: e.clientY};
    if (selectionText) {
        ipcRenderer.send('copy:text', selectionText)
        ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:3}))
        return;
    }

    const isInputElement = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
    const isContentEditable = e.target.isContentEditable;
    if(isInputElement || isContentEditable){
        ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:5}))
        return;
    }

    ipcRenderer.send("popup:contextMenu", Object.assign(data, {status:1}))
});

window.addEventListener('keydown', (event) => {
    const isInputElement = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
    const isContentEditable = event.target.isContentEditable;

    const hasInputContent = isInputElement && event.target.value.trim() !== '';
    const hasEditableContent = isContentEditable && event.target.innerText.trim() !== '';
    if (hasInputContent || hasEditableContent) {
        return;
    }

    if(event.key === "ArrowLeft"){
        ipcRenderer.send('history:goBack')
    }else if (event.key === "ArrowRight"){
        ipcRenderer.send('history:goForward')
    }
});

document.addEventListener('wheel', async (event) => {
    if (event.ctrlKey|| event.metaKey) {
        const isZoomOpen = await ipcRenderer.invoke("handle:zoom");
        if(isZoomOpen){
            event.preventDefault();
            const delta = event.deltaY;
            ipcRenderer.send('zoom:wheel', delta);
        }
    }
}, { passive: false });

document.addEventListener('fullscreenchange', async () => {
    if (document.fullscreenElement) {
        await ipcRenderer.invoke('handle:menu', true)
    } else {
        await ipcRenderer.invoke('handle:menu', false)
    }
});