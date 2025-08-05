class DownloadManager {
    constructor() {
        this.downloadHistory = [];
        this.activeDownloads = new Map();
        this.panel = null;
        this.init();
    }

    init() {
        this.loadHistory();
        this.createDownloadPanel();
        this.setupDownloadListener();
        this.setupContextMenu();
    }

    loadHistory() {
        const saved = localStorage.getItem('downloadHistory');
        if (saved) {
            this.downloadHistory = JSON.parse(saved);
        }
    }

    saveHistory() {
        localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
    }

    createDownloadPanel() {
        // 创建悬浮按钮
        this.createFloatingButton();
        
        // 创建下载面板
        const panel = document.createElement('div');
        panel.id = 'download-manager-panel';
        panel.className = 'download-panel floating';
        panel.style.cssText = `
            position: fixed;
            bottom: 150px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: white;
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 10003;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            display: none;
        `;
        panel.innerHTML = `
            <div class="download-header">
                <h3>下载管理器</h3>
                <button class="close-btn" onclick="downloadManager.hidePanel()">×</button>
            </div>
            <div class="download-tabs">
                <button class="tab-btn active" data-tab="active">进行中</button>
                <button class="tab-btn" data-tab="history">历史记录</button>
            </div>
            <div class="download-content">
                <div class="tab-content active" id="active-downloads">
                    <div class="no-downloads">暂无进行中的下载</div>
                </div>
                <div class="tab-content" id="download-history">
                    <div class="no-history">暂无下载历史</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;
        this.setupPanelEvents();
    }

    createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'download-floating-btn';
        button.innerHTML = '<span class="download-icon">📥</span>';
        button.style.cssText = `
            position: fixed;
            bottom: 85px;
            right: 20px;
            width: 55px;
            height: 55px;
            background: linear-gradient(135deg, #28a745, #20c997);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            transition: all 0.3s ease;
            user-select: none;
            font-size: 22px;
            color: white;
        `;

        // 添加事件监听
        button.addEventListener('click', () => this.togglePanel());
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
        });

        // 添加徽章
        const badge = document.createElement('div');
        badge.id = 'download-badge';
        badge.style.cssText = `
            position: absolute;
            bottom: -5px;
            right: -5px;
            background: #ff4757;
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        `;
        button.appendChild(badge);

        document.body.appendChild(button);
        this.floatingButton = button;
    }

    setupPanelEvents() {
        const tabBtns = this.panel.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        const closeBtn = this.panel.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hidePanel());
    }



    togglePanel() {
        if (this.panel) {
            if (this.panel.classList.contains('show')) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        }
    }

    showPanel() {
        if (this.panel) {
            this.renderActiveDownloads();
            this.panel.style.display = 'block';
            // 强制重排以确保动画生效
            this.panel.offsetHeight;
            this.panel.classList.add('show');
        }
    }

    hidePanel() {
        if (this.panel) {
            this.panel.classList.remove('show');
            setTimeout(() => {
                if (this.panel && !this.panel.classList.contains('show')) {
                    this.panel.style.display = 'none';
                }
            }, 300); // 等待动画完成
        }
    }

    switchTab(tabName) {
        const tabs = this.panel.querySelectorAll('.tab-btn');
        const contents = this.panel.querySelectorAll('.tab-content');

        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        this.panel.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName === 'active' ? 'active-downloads' : 'download-history').classList.add('active');

        if (tabName === 'history') {
            this.renderHistory();
        }
    }

    setupDownloadListener() {
        // 监听Chrome扩展API
        if (chrome && chrome.downloads) {
            chrome.downloads.onCreated.addListener((downloadItem) => {
                this.handleDownloadStart(downloadItem);
            });

            chrome.downloads.onChanged.addListener((delta) => {
                this.handleDownloadChange(delta);
            });

            chrome.downloads.onErased.addListener((downloadId) => {
                this.handleDownloadRemoved(downloadId);
            });
        }
        
        // 监听普通网页环境的下载
        this.interceptWebDownloads();
    }
    
    interceptWebDownloads() {
        // 拦截所有下载链接点击
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a[href], button[data-download]');
            if (target) {
                const url = target.href || target.dataset.download;
                if (url && this.isDownloadUrl(url)) {
                    e.preventDefault();
                    this.startWebDownload(url, target);
                }
            }
        });
        
        // 拦截表单提交下载
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.method === 'get' && this.isDownloadUrl(form.action)) {
                e.preventDefault();
                const url = new URL(form.action);
                const formData = new FormData(form);
                formData.forEach((value, key) => url.searchParams.append(key, value));
                this.startWebDownload(url.toString());
            }
        });
    }
    
    isDownloadUrl(url) {
        const downloadExtensions = [
            '.zip', '.rar', '.7z', '.exe', '.msi', '.dmg', '.pdf',
            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv',
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
            '.txt', '.csv', '.json', '.xml', '.torrent', '.apk', '.deb', '.rpm',
            '.tar', '.gz', '.bz2', '.pkg', '.bin'
        ];
        
        const downloadKeywords = [
            'download', 'attachment', 'file', 'export', 'download.php', 'getfile',
            'dl', 'attachment.php', 'force-download', 'content-disposition'
        ];
        
        const lowerUrl = url.toLowerCase();
        
        return downloadExtensions.some(ext => lowerUrl.includes(ext)) ||
               downloadKeywords.some(keyword => lowerUrl.includes(keyword)) ||
               (lowerUrl.includes('?') && (lowerUrl.includes('file=') || lowerUrl.includes('name=')));
    }
    
    startWebDownload(url, element = null) {
        // 先尝试HEAD请求获取文件信息
        const headRequest = new XMLHttpRequest();
        headRequest.open('HEAD', url, true);
        
        headRequest.onload = () => {
            let filename = this.extractFilenameFromUrl(url) || 'download';
            let mimeType = headRequest.getResponseHeader('Content-Type') || '';
            
            // 从HEAD响应获取文件名
            const contentDisposition = headRequest.getResponseHeader('Content-Disposition');
            const headerFilename = this.extractFilenameFromHeaders(contentDisposition);
            if (headerFilename) {
                filename = headerFilename;
            } else if (mimeType && !filename.includes('.')) {
                filename = this.generateFilenameFromMime(mimeType);
            }
            
            // 获取文件大小
            const contentLength = headRequest.getResponseHeader('Content-Length');
            const totalBytes = contentLength ? parseInt(contentLength) : 0;
            
            const downloadItem = {
                id: Date.now(),
                url: url,
                filename: filename,
                mime: mimeType,
                totalBytes: totalBytes,
                bytesReceived: 0,
                state: { current: 'in_progress' },
                startTime: new Date().toISOString()
            };
            
            this.handleDownloadStart(downloadItem);
            this.performWebDownload(downloadItem);
        };
        
        headRequest.onerror = () => {
            // HEAD请求失败，使用基础信息开始下载
            const downloadItem = {
                id: Date.now(),
                url: url,
                filename: this.extractFilenameFromUrl(url) || '未知文件',
                mime: null,
                totalBytes: 0,
                bytesReceived: 0,
                state: { current: 'in_progress' },
                startTime: new Date().toISOString()
            };
            
            this.handleDownloadStart(downloadItem);
            this.performWebDownload(downloadItem);
        };
        
        headRequest.send();
    }
    
    performWebDownload(downloadItem) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', downloadItem.url, true);
        xhr.responseType = 'blob';
        
        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                downloadItem.totalBytes = event.total;
                downloadItem.bytesReceived = event.loaded;
                this.activeDownloads.set(downloadItem.id, { ...downloadItem });
                this.renderActiveDownloads();
            }
        };
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                downloadItem.state = { current: 'complete' };
                downloadItem.bytesReceived = xhr.response.size;
                downloadItem.totalBytes = xhr.response.size;
                
                // 从响应头获取文件名
                const contentDisposition = xhr.getResponseHeader('Content-Disposition');
                let filename = this.extractFilenameFromHeaders(contentDisposition) || 
                             this.extractFilenameFromUrl(downloadItem.url) || 
                             this.generateFilenameFromMime(xhr.response.type) ||
                             'download';
                
                // 确保有正确的文件扩展名
                filename = this.ensureFileExtension(filename, xhr.response.type);
                
                downloadItem.filename = filename;
                
                // 创建下载链接
                const blob = new Blob([xhr.response]);
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
                
                this.completeDownload(downloadItem);
            }
        };
        
        xhr.onerror = () => {
            downloadItem.state = { current: 'interrupted' };
            this.activeDownloads.delete(downloadItem.id);
            this.renderActiveDownloads();
            this.updateBadge();
            this.showNotification('下载失败', `${downloadItem.filename} 下载失败`);
        };
        
        xhr.send();
    }
    
    extractFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename || null;
        } catch (e) {
            return null;
        }
    }

    extractFilenameFromHeaders(contentDisposition) {
        if (!contentDisposition) return null;
        
        // 匹配 filename*=UTF-8''格式
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match) {
            return decodeURIComponent(utf8Match[1]);
        }
        
        // 匹配 filename=""格式
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i);
        if (quotedMatch) {
            return quotedMatch[1];
        }
        
        // 匹配 filename=格式
        const simpleMatch = contentDisposition.match(/filename=([^;]+)/i);
        if (simpleMatch) {
            return simpleMatch[1].replace(/"/g, '').trim();
        }
        
        return null;
    }

    generateFilenameFromMime(mimeType) {
        const mimeMap = {
            'application/zip': 'file.zip',
            'application/x-zip-compressed': 'file.zip',
            'application/x-rar-compressed': 'file.rar',
            'application/x-7z-compressed': 'file.7z',
            'application/pdf': 'document.pdf',
            'application/msword': 'document.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document.docx',
            'application/vnd.ms-excel': 'document.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document.xlsx',
            'application/vnd.ms-powerpoint': 'presentation.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation.pptx',
            'audio/mpeg': 'audio.mp3',
            'audio/wav': 'audio.wav',
            'video/mp4': 'video.mp4',
            'video/mpeg': 'video.mpg',
            'video/avi': 'video.avi',
            'image/jpeg': 'image.jpg',
            'image/png': 'image.png',
            'image/gif': 'image.gif',
            'image/webp': 'image.webp',
            'text/plain': 'document.txt',
            'application/octet-stream': 'file.bin'
        };
        
        return mimeMap[mimeType] || 'download';
    }

    ensureFileExtension(filename, mimeType) {
        const extensionMap = {
            'application/zip': '.zip',
            'application/x-zip-compressed': '.zip',
            'application/x-rar-compressed': '.rar',
            'application/x-7z-compressed': '.7z',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'video/mp4': '.mp4',
            'video/mpeg': '.mpg',
            'video/avi': '.avi',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'text/plain': '.txt'
        };
        
        const extension = extensionMap[mimeType];
        if (extension && !filename.toLowerCase().endsWith(extension)) {
            return filename + extension;
        }
        
        return filename;
    }

    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'A' && e.target.href) {
                const linkUrl = e.target.href;
                this.showContextMenu(e.clientX, e.clientY, linkUrl);
                e.preventDefault();
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showContextMenu(x, y, url) {
        let menu = document.getElementById('download-context-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'download-context-menu';
            menu.className = 'context-menu';
            menu.innerHTML = `
                <div class="context-item" onclick="downloadManager.downloadUrl('${url}')">
                    下载此链接
                </div>
            `;
            document.body.appendChild(menu);
        }
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }

    hideContextMenu() {
        const menu = document.getElementById('download-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }

    downloadUrl(url) {
        if (chrome && chrome.downloads) {
            chrome.downloads.download({ url: url });
        } else {
            // 普通网页环境下使用startWebDownload
            this.startWebDownload(url);
        }
    }

    handleDownloadStart(downloadItem) {
        this.activeDownloads.set(downloadItem.id, downloadItem);
        this.renderActiveDownloads();
        this.updateBadge();
    }

    handleDownloadChange(delta) {
        const downloadId = delta.id;
        if (chrome && chrome.downloads) {
            chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results[0]) {
                    const downloadItem = results[0];
                    
                    if (downloadItem.state && downloadItem.state.current === 'complete') {
                        this.completeDownload(downloadItem);
                    } else {
                        this.activeDownloads.set(downloadId, downloadItem);
                        this.renderActiveDownloads();
                    }
                }
            });
        }
    }

    completeDownload(downloadItem) {
        this.activeDownloads.delete(downloadItem.id);
        
        const historyItem = {
            id: downloadItem.id,
            filename: downloadItem.filename || '未知文件',
            url: downloadItem.url,
            totalBytes: downloadItem.totalBytes,
            startTime: new Date(downloadItem.startTime).toLocaleString(),
            endTime: new Date().toLocaleString(),
            mime: downloadItem.mime
        };

        this.downloadHistory.unshift(historyItem);
        if (this.downloadHistory.length > 100) {
            this.downloadHistory = this.downloadHistory.slice(0, 100);
        }
        
        this.saveHistory();
        this.renderActiveDownloads();
        this.updateBadge();
        this.showNotification('下载完成', `${historyItem.filename} 下载完成`);
    }

    handleDownloadRemoved(downloadId) {
        this.activeDownloads.delete(downloadId);
        this.renderActiveDownloads();
        this.updateBadge();
    }

    renderActiveDownloads() {
        const container = document.getElementById('active-downloads');
        if (!container) return;

        if (this.activeDownloads.size === 0) {
            container.innerHTML = '<div class="no-downloads">暂无进行中的下载</div>';
            return;
        }

        container.innerHTML = '';
        this.activeDownloads.forEach((download) => {
            const progress = download.totalBytes > 0 ? (download.bytesReceived / download.totalBytes) * 100 : 0;
            const item = document.createElement('div');
            item.className = 'download-item active';
            
            const downloadInfo = document.createElement('div');
            downloadInfo.className = 'download-info';
            downloadInfo.innerHTML = `
                <div class="filename">${download.filename || '未知文件'}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="download-details">
                    <span>${this.formatBytes(download.bytesReceived)} / ${this.formatBytes(download.totalBytes)}</span>
                    <span>${Math.round(progress)}%</span>
                </div>
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => this.cancelDownload(download.id));
            
            item.appendChild(downloadInfo);
            item.appendChild(cancelBtn);
            container.appendChild(item);
        });
    }

    renderHistory() {
        const container = document.getElementById('download-history');
        if (!container) return;

        if (this.downloadHistory.length === 0) {
            container.innerHTML = '<div class="no-history">暂无下载历史</div>';
            return;
        }

        container.innerHTML = '';
        this.downloadHistory.forEach((item) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'download-item history';
            
            const downloadInfo = document.createElement('div');
            downloadInfo.className = 'download-info';
            downloadInfo.innerHTML = `
                <div class="filename">${item.filename}</div>
                <div class="download-meta">
                    <span>大小: ${this.formatBytes(item.totalBytes)}</span>
                    <span>时间: ${item.endTime}</span>
                </div>
            `;
            
            const actions = document.createElement('div');
            actions.className = 'download-actions';
            
            const reDownloadBtn = document.createElement('button');
            reDownloadBtn.textContent = '重新下载';
            reDownloadBtn.addEventListener('click', () => this.reDownload(item.url));
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '删除';
            removeBtn.addEventListener('click', () => this.removeFromHistory(item.id));
            
            actions.appendChild(reDownloadBtn);
            actions.appendChild(removeBtn);
            
            historyItem.appendChild(downloadInfo);
            historyItem.appendChild(actions);
            container.appendChild(historyItem);
        });
    }

    cancelDownload(downloadId) {
        if (chrome && chrome.downloads) {
            chrome.downloads.cancel(downloadId);
        }
        this.activeDownloads.delete(downloadId);
        this.renderActiveDownloads();
        this.updateBadge();
    }

    reDownload(url) {
        this.startWebDownload(url);
    }

    removeFromHistory(downloadId) {
        this.downloadHistory = this.downloadHistory.filter(item => item.id !== downloadId);
        this.saveHistory();
        this.renderHistory();
    }

    updateBadge() {
        const badge = document.getElementById('download-badge');
        const floatingBtn = document.getElementById('download-floating-btn');
        if (!badge || !floatingBtn) return;
        
        const activeCount = this.activeDownloads.size;
        const prevCount = parseInt(badge.textContent) || 0;
        
        if (activeCount > 0) {
            badge.textContent = activeCount > 99 ? '99+' : activeCount;
            badge.style.display = 'flex';
            
            // 新增下载时的动效
            if (activeCount > prevCount) {
                floatingBtn.classList.add('new-download');
                badge.classList.add('new');
                
                setTimeout(() => {
                    floatingBtn.classList.remove('new-download');
                    badge.classList.remove('new');
                }, 800);
            }
            
            // 持续下载时的动效
            if (!floatingBtn.classList.contains('downloading')) {
                floatingBtn.classList.add('downloading');
            }
        } else {
            badge.style.display = 'none';
            floatingBtn.classList.remove('downloading');
        }
    }

    showNotification(title, message) {
        // 创建自定义通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10005;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #333;">${title}</div>
            <div style="color: #666; font-size: 14px;">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // 同时尝试使用系统通知
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body: message });
                }
            });
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    clearHistory() {
        this.downloadHistory = [];
        this.saveHistory();
        this.renderHistory();
    }
}

const downloadManager = new DownloadManager();

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        downloadManager.togglePanel();
    }
});

window.downloadManager = downloadManager;