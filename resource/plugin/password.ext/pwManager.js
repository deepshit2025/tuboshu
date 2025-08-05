class PwManager {
    constructor() {
        this.currentDomain = window.location.hostname;
        this.observer = null;
        this.init();
    }

    init() {
        if (this.hasPasswordFields()) {
            this.setupMutationObserver();
            this.attachToExistingFields();
            this.restoreCredentials();
        }
    }

    hasPasswordFields() {
        return document.querySelector('input[type="password"]') !== null;
    }

    setupMutationObserver() {
        this.observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    this.handleNewNodes(mutation.addedNodes);
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    handleNewNodes(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === 1) {
                const passwordFields = node.querySelectorAll ?
                    node.querySelectorAll('input[type="password"]') : [];

                passwordFields.forEach(passwordField => {
                    this.attachToPasswordField(passwordField);
                });

                if (node.matches('input[type="password"]')) {
                    this.attachToPasswordField(node);
                }
            }
        });
    }

    // 绑定已有字段
    attachToExistingFields() {
        document.querySelectorAll('input[type="password"]').forEach(passwordField => {
            this.attachToPasswordField(passwordField);
        });
    }

    attachToPasswordField(passwordField) {
        const usernameField = this.findUsernameFieldForPassword(passwordField);

        this.overrideAutocomplete(usernameField);
        this.overrideAutocomplete(passwordField);

        // 绑定输入事件
        const handler = this.handleInputChange.bind(this);
        if (usernameField) {
            usernameField.addEventListener('input', handler);
        }
        passwordField.addEventListener('input', handler);

        // 绑定回车键提交
        passwordField.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.saveCredentials();
                setTimeout(this.saveCredentials.bind(this), 100);
            }
        });
    }

    findUsernameFieldForPassword(passwordField) {
        // 查找逻辑优化：同级元素、常见模式、属性匹配等
        const container = passwordField.closest('form, div, span, section') || document;
        const candidates = [
            'input[type="text"]',
            'input[type="email"]',
            'input[autocomplete="username"]',
            'input[name*="user"]',
            'input[name*="name"]',
            'input[name*="login"]',
            'input[id*="user"]'
        ];

        // 优先查找前面的输入框
        const allInputs = container.querySelectorAll('input');
        for (let i = 0; i < allInputs.length; i++) {
            if (allInputs[i] === passwordField && i > 0) {
                const prevInput = allInputs[i - 1];
                if (prevInput.matches(candidates.join(','))) {
                    return prevInput;
                }
            }
        }

        // 通用查找
        for (const selector of candidates) {
            const field = container.querySelector(selector);
            if (field && field !== passwordField) return field;
        }

        return null;
    }

    overrideAutocomplete(field) {
        if (field && field.autocomplete === "off") {
            field.autocomplete = "new-password";
            setTimeout(() => {
                field.autocomplete = "off";
            }, 1000);
        }
    }

    handleInputChange(e) {
        this.saveCredentials();
    }

    saveCredentials() {
        // 查找所有密码字段并保存第一个有效组合
        document.querySelectorAll('input[type="password"]').forEach(passwordField => {
            const usernameField = this.findUsernameFieldForPassword(passwordField);
            const username = usernameField?.value;
            const password = passwordField.value;

            if (username && password) {
                const data = {
                    username,
                    password: btoa(unescape(encodeURIComponent(password)))
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        });
    }

    restoreCredentials() {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        const retry = () => {
            document.querySelectorAll('input[type="password"]').forEach(passwordField => {
                const usernameField = this.findUsernameFieldForPassword(passwordField);
                this.fillField(usernameField, data.username);
                this.fillField(passwordField, data.password);
            });
        };

        retry();
        setTimeout(retry, 300);
    }

    fillField(field, value) {
        if (!field || !value) return;

        try {
            let decodedValue;
            
            if (field.type === "password") {
                // 检查是否是旧格式（直接存储的原始值）
                if (!this.isBase64Encoded(value)) {
                    // 旧格式，直接使用原始值
                    decodedValue = value;
                } else {
                    // 新格式，使用标准解码
                    decodedValue = decodeURIComponent(escape(atob(value)));
                }
            } else {
                decodedValue = value;
            }

            if (field.value !== decodedValue) {
                field.value = decodedValue;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (e) {
            console.error("字段填充失败:", e);
            // 如果解码失败，尝试直接使用原始值
            field.value = value || '';
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    isBase64Encoded(str) {
        // 检查字符串是否是有效的base64编码
        try {
            return btoa(atob(str)) === str;
        } catch (e) {
            return false;
        }
    }

    get storageKey() {
        return `pm-${this.currentDomain}`;
    }
    
    isBase64Encoded(str) {
        // 检查字符串是否是有效的base64编码
        try {
            return btoa(atob(str)) === str;
        } catch (e) {
            return false;
        }
    }
}

// 包裹初始化逻辑到DOMContentLoaded事件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __initializePasswordManager);
} else {
    __initializePasswordManager();
}

function __initializePasswordManager() {
    const passwordFields = document.querySelectorAll('input[type="password"]');
    console.log('[PW Manager] 检测到', passwordFields.length, '个密码输入框');

    if (passwordFields.length > 0) {
        new PwManager();
        console.log('[PW Manager] 初始化完成');
    }
}

// 全局唯一PwManager类声明
class PwManager {
    constructor() {
        this.currentDomain = window.location.hostname;
        this.observer = null;
        this.init();
        console.log('[PW Manager] 开始创建UI');
        this.createUI();
        this.bindUIEvents();
    }

    init() {
        if (this.hasPasswordFields()) {
            this.setupMutationObserver();
            this.attachToExistingFields();
            this.restoreCredentials();
        }
    }

    setupMutationObserver() {
        this.observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    this.handleNewNodes(mutation.addedNodes);
                }
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    handleNewNodes(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === 1) {
                const passwordFields = node.querySelectorAll ?
                    node.querySelectorAll('input[type="password"]') : [];

                passwordFields.forEach(passwordField => {
                    this.attachToPasswordField(passwordField);
                });

                if (node.matches('input[type="password"]')) {
                    this.attachToPasswordField(node);
                }
            }
        });
    }

    // 绑定已有字段
    attachToExistingFields() {
        document.querySelectorAll('input[type="password"]').forEach(passwordField => {
            this.attachToPasswordField(passwordField);
        });
    }

    attachToPasswordField(passwordField) {
        const usernameField = this.findUsernameFieldForPassword(passwordField);

        this.overrideAutocomplete(usernameField);
        this.overrideAutocomplete(passwordField);

        const handler = this.handleInputChange.bind(this);
        if (usernameField) {
            usernameField.addEventListener('input', handler);
        }
        passwordField.addEventListener('input', handler);

        passwordField.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.saveCredentials();
                setTimeout(this.saveCredentials.bind(this), 100);
            }
        });
    }

    findUsernameFieldForPassword(passwordField) {
        const container = passwordField.closest('form, div, span, section') || document;
        const candidates = [
            'input[type="text"]',
            'input[type="email"]',
            'input[autocomplete="username"]',
            'input[name*="user"]',
            'input[name*="name"]',
            'input[name*="login"]',
            'input[id*="user"]'
        ];

        const allInputs = container.querySelectorAll('input');
        for (let i = 0; i < allInputs.length; i++) {
            if (allInputs[i] === passwordField && i > 0) {
                const prevInput = allInputs[i - 1];
                if (prevInput.matches(candidates.join(','))) {
                    return prevInput;
                }
            }
        }

        for (const selector of candidates) {
            const field = container.querySelector(selector);
            if (field && field !== passwordField) return field;
        }

        return null;
    }

    overrideAutocomplete(field) {
        if (field && field.autocomplete === "off") {
            field.autocomplete = "new-password";
            setTimeout(() => {
                field.autocomplete = "off";
            }, 1000);
        }
    }

    handleInputChange(e) {
        this.saveCredentials();
    }

    saveCredentials() {
        document.querySelectorAll('input[type="password"]').forEach(passwordField => {
            const usernameField = this.findUsernameFieldForPassword(passwordField);
            const username = usernameField?.value;
            const password = passwordField.value;

            if (username && password) {
                const data = {
                    username,
                    password: btoa(unescape(encodeURIComponent(password)))
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        });
    }

    restoreCredentials() {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        const retry = () => {
            document.querySelectorAll('input[type="password"]').forEach(passwordField => {
                const usernameField = this.findUsernameFieldForPassword(passwordField);
                this.fillField(usernameField, data.username);
                this.fillField(passwordField, data.password);
            });
        };

        retry();
        setTimeout(retry, 300);
    }

    fillField(field, value) {
        if (!field || !value) return;

        try {
            const decodedValue = field.type === "password"
                ? decodeURIComponent(escape(atob(value)))
                : value;

            if (field.value !== decodedValue) {
                field.value = decodedValue;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (e) {
            console.error("字段填充失败:", e);
        }
    }

    get storageKey() {
        return `pm-${this.currentDomain}`;
    }

    createUI() {
        const style = document.createElement('style');
        style.textContent = `
            .pm-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                background: var(--color-accent-emphasis);
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pm-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--color-canvas-default);
                border: 1px solid var(--color-border-default);
                border-radius: 6px;
                padding: 16px;
                width: 400px;
                max-width: 90%;
                z-index: 10000;
            }

            .pm-credential-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 8px;
                background: var(--color-neutral-subtle);
                border-radius: 4px;
            }

            .pm-password {
                -webkit-text-security: disc;
                margin: 0 8px;
            }
            .pm-password.show {
                -webkit-text-security: none;
            }
        `;
        document.head.appendChild(style);

        this.uiContainer = document.createElement('div');
        this.uiContainer.innerHTML = `
            <div class="pm-floating-btn">🔐</div>
            <div class="pm-modal" hidden>
                <h3>已保存的凭证</h3>
                <div class="pm-credential-list"></div>
                <button class="pm-close-btn">关闭</button>
            </div>
        `;
        document.body.appendChild(this.uiContainer);
    }

    bindUIEvents() {
        this.uiContainer.querySelector('.pm-floating-btn').addEventListener('click', () => {
            this.showCredentials();
        });

        this.uiContainer.querySelector('.pm-close-btn').addEventListener('click', () => {
            this.uiContainer.querySelector('.pm-modal').hidden = true;
        });
    }
}

    saveCredentials() {
        try {
            // 移除调试日志
            document.querySelectorAll('input[type="password"]').forEach(passwordField => {
                const usernameField = this.findUsernameFieldForPassword(passwordField);
                const username = usernameField?.value;
                const password = passwordField.value;

                if (username && password) {
                    const data = {
                        username,
                        password: btoa(unescape(encodeURIComponent(password)))
                    };
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                }
            });
        } catch (e) {
            console.error('保存失败:', e);
        }
    }

    // 移除logError方法
}

// 移除全局调试对象
}

    initDebugConsole() {
        console.debug('[PW Manager] 插件初始化 - 版本:', this.getVersion());
        window.__pwManagerDebug = {
            getStatus: () => ({
                storageKey: this.storageKey,
                lastSave: localStorage.getItem(this.storageKey) ? '有数据' : '空',
                attachedFields: document.querySelectorAll('input[type="password"]').length
            }),
            toggleDebug: (enable) => {
                this.debugMode = enable;
                localStorage.setItem('debugPwManager', enable);
                console.log(`[PW Manager] 调试模式 ${enable ? '启用' : '禁用'}`);
            }
        };
    }

    // 新增版本获取方法
    getVersion() {
        return '1.2.0';
    }

    saveCredentials() {
        try {
            // 查找所有密码字段并保存第一个有效组合
            document.querySelectorAll('input[type="password"]').forEach(passwordField => {
                const usernameField = this.findUsernameFieldForPassword(passwordField);
                const username = usernameField?.value;
                const password = passwordField.value;

                if (username && password) {
                    const data = {
                        username,
                        password: btoa(unescape(encodeURIComponent(password)))
                    };
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                }
            });
        } catch (e) {
            console.error('[PW Manager] 保存失败:', e.stack);
            this.logError('SAVE_ERR', e);
        }
    }

    // 新增错误日志方法
    logError(code, error) {
        const errorMap = {
            'PARSE_ERR': '数据解析失败',
            'STORAGE_ERR': '存储操作异常',
            'CRYPTO_ERR': '加密处理错误'
        };

        console.groupCollapsed(`[PW Manager] 错误 ${code}: ${errorMap[code]}`);
        console.error('错误详情:', error);
        console.trace('堆栈追踪:');
        console.groupEnd();
    }

    // 新增简易哈希函数（调试用）
    sha256(str) {
        // ... existing crypto logic ...
    }
}

    // 新增UI创建方法
    createUI() {
        const style = document.createElement('style');
        style.textContent = `
            .pm-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                background: var(--color-accent-emphasis);
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pm-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--color-canvas-default);
                border: 1px solid var(--color-border-default);
                border-radius: 6px;
                padding: 16px;
                width: 400px;
                max-width: 90%;
                z-index: 10000;
            }

            .pm-credential-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 8px;
                background: var(--color-neutral-subtle);
                border-radius: 4px;
            }

            .pm-password {
                -webkit-text-security: disc;
                margin: 0 8px;
            }
            .pm-password.show {
                -webkit-text-security: none;
            }
        `;
        document.head.appendChild(style);

        this.uiContainer = document.createElement('div');
        this.uiContainer.innerHTML = `
            <div class="pm-floating-btn">🔐</div>
            <div class="pm-modal" hidden>
                <h3>已保存的凭证</h3>
                <div class="pm-credential-list"></div>
                <button class="pm-close-btn">关闭</button>
            </div>
        `;
        document.body.appendChild(this.uiContainer);
    }

    // 新增事件绑定
    bindUIEvents() {
        this.uiContainer.querySelector('.pm-floating-btn').addEventListener('click', () => {
            this.showCredentials();
        });

        this.uiContainer.querySelector('.pm-close-btn').addEventListener('click', () => {
            this.uiContainer.querySelector('.pm-modal').hidden = true;
        });
    }

    // 新增凭证展示逻辑
    showCredentials() {
        const listContainer = this.uiContainer.querySelector('.pm-credential-list');
        listContainer.innerHTML = '';

        const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        if (data.username) {
            const item = document.createElement('div');
            item.className = 'pm-credential-item';
            item.innerHTML = `
                <span>${data.username}</span>
                <input type="text" class="pm-password" value="${decodeURIComponent(escape(atob(data.password)))}" readonly>
                <button class="pm-toggle-pw">👁️</button>
                <button class="pm-copy-pw">⎘</button>
            `;

            item.querySelector('.pm-toggle-pw').addEventListener('click', (e) => {
                e.target.previousElementSibling.classList.toggle('show');
            });

            item.querySelector('.pm-copy-pw').addEventListener('click', () => {
                navigator.clipboard.writeText(decodeURIComponent(escape(atob(data.password))));
            });

            listContainer.appendChild(item);
        }

        this.uiContainer.querySelector('.pm-modal').hidden = false;
    }
}