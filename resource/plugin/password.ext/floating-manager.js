class FloatingPasswordManager {
    constructor() {
        this.isOpen = false;
        this.currentDomain = window.location.hostname;
        this.styles = {
            button: {
                base: 'position: fixed; bottom: 20px; right: 20px; width: 55px; height: 55px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; transition: all 0.3s ease; user-select: none;',
                hover: 'transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.4);',
                normal: 'transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.3);'
            },
            panel: {
                base: 'position: fixed; bottom: 85px; right: 20px; width: 320px; max-height: 480px; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); z-index: 10001; display: none; flex-direction: column; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
            }
        };
        this.selectors = {
            username: [
                'input[type="text"]', 'input[type="email"]', 'input[name*="user"]', 'input[name*="name"]', 
                'input[name*="login"]', 'input[name*="account"]', 'input[name*="email"]', 'input[name*="phone"]',
                'input[id*="user"]', 'input[id*="login"]', 'input[id*="account"]', 'input[id*="email"]',
                'input[placeholder*="用户"]', 'input[placeholder*="账号"]', 'input[placeholder*="邮箱"]', 
                'input[placeholder*="手机"]', 'input[placeholder*="登录"]', 'input[autocomplete="username"]', 
                'input[autocomplete="email"]'
            ],
            password: [
                'input[type="password"]', 'input[name*="password"]', 'input[name*="passwd"]', 
                'input[name*="pass"]', 'input[id*="password"]', 'input[id*="passwd"]', 'input[id*="pass"]',
                'input[placeholder*="密码"]', 'input[placeholder*="口令"]', 'input[placeholder*="pass"]',
                'input[autocomplete="current-password"]', 'input[autocomplete="new-password"]'
            ]
        };
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createPanel();
        this.loadPasswords();
        this.bindEvents();
    }

    createFloatingButton() {
        const button = document.createElement('div');
        button.id = 'floating-pw-btn';
        button.innerHTML = '🔒';
        button.style.cssText = this.styles.button.base;

        const handleMouseEnter = () => {
            button.style.cssText = this.styles.button.base + this.styles.button.hover;
        };

        const handleMouseLeave = () => {
            button.style.cssText = this.styles.button.base + this.styles.button.normal;
        };

        button.addEventListener('mouseenter', handleMouseEnter);
        button.addEventListener('mouseleave', handleMouseLeave);

        document.body.appendChild(button);
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'floating-pw-panel';
        panel.style.cssText = this.styles.panel.base;

        panel.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px;">密码管理器</h3>
                <button id="close-panel-btn" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="padding: 15px; border-bottom: 1px solid #eee;">
                <input type="text" id="search-pw" placeholder="搜索密码..." style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
            </div>
            
            <div id="password-list" style="flex: 1; overflow-y: auto; padding: 12px;">
                <!-- 密码列表将在这里动态生成 -->
            </div>
            
            <div style="padding: 12px; border-top: 1px solid #eee; display: flex; gap: 6px; flex-wrap: wrap;">
                <button id="add-pw-btn" style="flex: 1; min-width: 42px; background: #667eea; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">添加</button>
                <button id="current-site-btn" style="flex: 1; min-width: 42px; background: #28a745; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">填充</button>
                <button id="detect-form-btn" style="flex: 1; min-width: 42px; background: #17a2b8; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">检测</button>
                <button id="export-all-btn" style="flex: 1; min-width: 42px; background: #6f42c1; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">导出</button>
                <button id="import-btn" style="flex: 1; min-width: 42px; background: #fd7e14; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">导入</button>
            </div>
        `;

        document.body.appendChild(panel);
    }

    loadPasswords() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('pm-'));
        this.passwords = {};
        keys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                // 检查是否需要迁移旧数据
                if (data && data.password && !this.isBase64Encoded(data.password)) {
                    console.log('发现旧格式密码，正在迁移:', key);
                    // 将密码重新编码为新格式
                    data.password = btoa(unescape(encodeURIComponent(data.password)));
                    localStorage.setItem(key, JSON.stringify(data));
                    console.log('密码数据已迁移:', key);
                }
                
                this.passwords[key] = {
                    ...data,
                    domain: key.replace('pm-', ''),
                    created: data.created || new Date().toISOString()
                };
            } catch (e) {
                console.error('加载密码失败:', key, e);
            }
        });
        this.renderPasswordList();
    }

    renderPasswordList(filter = '') {
        const listContainer = document.getElementById('password-list');
        const passwords = Object.entries(this.passwords);
        
        if (filter) {
            const filtered = passwords.filter(([key, data]) => 
                data.domain.toLowerCase().includes(filter.toLowerCase()) ||
                data.username.toLowerCase().includes(filter.toLowerCase()) ||
                (data.notes && data.notes.toLowerCase().includes(filter.toLowerCase()))
            );
            passwords.splice(0, passwords.length, ...filtered);
        }

        if (passwords.length === 0) {
            listContainer.innerHTML = this.getEmptyStateHTML();
            return;
        }

        let html = '';
        const currentDomainPasswords = passwords.filter(([key, data]) => data.domain === this.currentDomain);
        const otherPasswords = passwords.filter(([key, data]) => data.domain !== this.currentDomain);

        if (currentDomainPasswords.length > 0) {
            html += this.getSectionHeader('当前网站');
            currentDomainPasswords.forEach(([key, data]) => {
                html += this.getPasswordItemHTML(key, data, true);
            });
        }

        if (otherPasswords.length > 0) {
            if (currentDomainPasswords.length > 0) {
                html += this.getSectionHeader('其他网站');
            }
            otherPasswords.forEach(([key, data]) => {
                html += this.getPasswordItemHTML(key, data, false);
            });
        }

        listContainer.innerHTML = html;
    }

    getEmptyStateHTML() {
        return `
            <div style="text-align: center; color: #666; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
                <div style="font-size: 16px; margin-bottom: 8px;">暂无保存的密码</div>
                <div style="font-size: 14px; color: #888;">没有找到匹配的密码</div>
            </div>
        `;
    }

    getSectionHeader(title) {
        return `<div style="padding: 8px 16px; background: #f8f9fa; font-size: 13px; color: #666; font-weight: 500;">${title}</div>`;
    }

    getPasswordItemHTML(key, data, isCurrent) {
        const displayTitle = data.notes && data.notes.trim() ? data.notes.split('\n')[0] : data.domain;
        const subTitle = data.notes && data.notes.trim() ? `${data.username} • ${data.domain}` : data.username;
        const currentTag = isCurrent ? '<div style="position: absolute; top: 4px; right: 6px; background: #667eea; color: white; padding: 1px 4px; border-radius: 2px; font-size: 10px; font-weight: bold;">当前</div>' : '';
        const notesExtra = data.notes && data.notes.trim() && displayTitle !== data.notes.split('\n')[0] ? `<div style="color: #718096; font-size: 11px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.notes}</div>` : '';

        return `
            <div class="password-item" data-key="${key}" style="
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                padding: 10px 12px;
                border: 1px solid ${isCurrent ? '#667eea' : '#e0e0e0'};
                border-radius: 6px;
                margin-bottom: 6px;
                background: ${isCurrent ? '#f5f3ff' : '#fafafa'};
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            " onmouseover="this.style.background='${isCurrent ? '#f0edff' : '#f5f5f5'}'; this.style.borderColor='${isCurrent ? '#5a67d8' : '#ccc'}'" onmouseout="this.style.background='${isCurrent ? '#f5f3ff' : '#fafafa'}'; this.style.borderColor='${isCurrent ? '#667eea' : '#e0e0e0'}'">
                ${currentTag}
                <div style="flex: 1; overflow: hidden; padding-right: 6px;">
                    <div style="font-weight: 600; color: #2d3748; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px;">
                        ${displayTitle}
                    </div>
                    <div style="color: #4a5568; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${subTitle}
                    </div>
                    ${notesExtra}
                </div>
                <div style="display: flex; gap: 4px; margin-left: 8px;">
                    <button class="fill-btn" data-key="${key}" style="
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 4px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.background='#5a67d8'" onmouseout="this.style.background='#667eea'" title="填充表单">填充</button>
                    <button class="copy-btn" data-key="${key}" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 4px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.background='#23923d'" onmouseout="this.style.background='#28a745'" title="复制密码">复制</button>
                    <button class="edit-btn" data-key="${key}" style="
                        background: #ffc107;
                        color: black;
                        border: none;
                        padding: 4px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.background='#e0a800'" onmouseout="this.style.background='#ffc107'" title="编辑">编辑</button>
                    <button class="delete-btn" data-key="${key}" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 4px 6px;
                        border-radius: 4px;
                        font-size: 11px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'" title="删除">删除</button>
                </div>
            </div>
        `;
    }

    togglePanel() {
        const panel = document.getElementById('floating-pw-panel');
        const button = document.getElementById('floating-pw-btn');
        
        if (this.isOpen) {
            panel.style.display = 'none';
            button.innerHTML = '🔒';
        } else {
            panel.style.display = 'flex';
            button.innerHTML = '✕';
            this.loadPasswords();
        }
        this.isOpen = !this.isOpen;
    }

    showAddForm() {
        // 新增密码时清空输入框，不自动填充当前表单内容
        this.showAddFormInline('', '');
    }

    showAddFormInline(defaultUsername = '', defaultPassword = '') {
        const panel = document.getElementById('floating-pw-panel');
        
        // 创建添加表单
        const addForm = document.createElement('div');
        addForm.id = 'add-password-form';
        addForm.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 100;
            padding: 20px;
            display: flex;
            flex-direction: column;
        `;

        addForm.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">添加新密码</h3>
                <button id="cancel-add-btn" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="flex: 1; overflow-y: auto;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #667eea;">主要标识（备注）：</label>
                    <input type="text" id="add-notes" style="width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 4px; font-size: 15px; font-weight: 500;" placeholder="例如：百度网盘个人账号、公司邮箱等">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">用户名：</label>
                    <input type="text" id="add-username" value="${defaultUsername}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 15px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">密码：</label>
                    <div style="position: relative;">
                        <input type="password" id="add-password" value="${defaultPassword}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; padding-right: 40px; font-size: 15px;">
                        <button type="button" id="toggle-password-btn" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">👁️</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">网站域名：</label>
                    <input type="text" id="add-domain" value="${this.currentDomain}" style="width: 60%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 15px;">
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="save-password-btn" style="flex: 1; background: #667eea; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">保存</button>
                <button id="cancel-save-btn" style="flex: 1; background: #6c757d; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        `;

        panel.appendChild(addForm);

        // 绑定事件
        document.getElementById('cancel-add-btn').addEventListener('click', () => {
            addForm.remove();
        });

        document.getElementById('cancel-save-btn').addEventListener('click', () => {
            addForm.remove();
        });

        document.getElementById('toggle-password-btn').addEventListener('click', () => {
            const passwordInput = document.getElementById('add-password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                document.getElementById('toggle-password-btn').textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                document.getElementById('toggle-password-btn').textContent = '👁️';
            }
        });

        document.getElementById('save-password-btn').addEventListener('click', () => {
            const domain = document.getElementById('add-domain').value.trim();
            const username = document.getElementById('add-username').value.trim();
            const password = document.getElementById('add-password').value.trim();
            const notes = document.getElementById('add-notes').value.trim();

            if (!domain) {
                alert('请输入网站域名');
                return;
            }

            if (!username) {
                alert('请输入用户名');
                return;
            }

            if (!password) {
                alert('请输入密码');
                return;
            }

            this.savePassword(domain, username, password, notes);
            addForm.remove();
            this.showToast('密码已保存');
        });
    }

    savePassword(domain, username, password, notes = '') {
        // 使用用户名+域名组合作为唯一键，支持同一域名多个账号
        const usernameHash = btoa(username).substring(0, 8);
        const key = `pm-${domain}-${usernameHash}`;
        
        const data = {
            username,
            password: btoa(unescape(encodeURIComponent(password))),
            notes,
            domain: domain,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        localStorage.setItem(key, JSON.stringify(data));
        this.loadPasswords();
        this.showToast('密码已保存');
    }

    fillForm(key) {
        console.log('开始填充表单，key:', key);
        const password = this.getPassword(key);
        if (!password) {
            console.log('未找到密码数据');
            return;
        }

        console.log('找到密码数据:', password);

        // 查找并填充表单
        const usernameField = this.findUsernameField();
        const passwordField = this.findPasswordField();

        console.log('用户名输入框:', usernameField);
        console.log('密码输入框:', passwordField);

        if (usernameField) {
            usernameField.value = password.username;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('已填充用户名:', password.username);
        } else {
            console.log('未找到用户名输入框');
        }

        if (passwordField) {
            passwordField.value = password.password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('已填充密码:', password.password);
        } else {
            console.log('未找到密码输入框');
        }

        this.showToast('表单已填充');
    }

    findUsernameField() {
        // 排除插件自身的用户名输入框
        const pluginContainer = document.getElementById('floating-pw-panel');
        const searchContainer = document.getElementById('electron-search-bar');
        
        const isInPluginContainer = (element) => {
            return pluginContainer?.contains(element) || searchContainer?.contains(element);
        };
        
        // 优先查找用户名输入框
        for (const selector of this.selectors.username) {
            const fields = document.querySelectorAll(selector);
            for (const field of fields) {
                if (field.type !== 'password' && 
                    field.offsetParent !== null && 
                    !isInPluginContainer(field)) {
                    return field;
                }
            }
        }
        
        // 更广泛的搜索
        const allInputs = document.querySelectorAll('input');
        for (const input of allInputs) {
            if (input.type === 'password') continue;
            if (input.offsetParent === null) continue;
            if (isInPluginContainer(input)) continue;
            
            const lower = (input.name + input.id + input.placeholder).toLowerCase();
            if (/用户|账号|邮箱|手机|用户名|账户|user|email|phone/.test(lower)) {
                return input;
            }
        }
        
        // 通过label匹配
        for (const label of document.querySelectorAll('label')) {
            if (/用户|账号|邮箱|手机|用户名|账户|user|email|phone/.test(label.textContent.toLowerCase())) {
                const inputId = label.getAttribute('for');
                const input = inputId ? document.getElementById(inputId) : label.querySelector('input');
                if (input?.offsetParent !== null && !isInPluginContainer(input)) {
                    return input;
                }
            }
        }
        
        return null;
    }

    findPasswordField() {
        // 排除插件自身的密码输入框
        const pluginContainer = document.getElementById('floating-pw-panel');
        const searchContainer = document.getElementById('electron-search-bar');
        
        const isInPluginContainer = (element) => {
            return pluginContainer?.contains(element) || searchContainer?.contains(element);
        };
        
        // 优先查找密码输入框
        for (const selector of this.selectors.password) {
            const fields = document.querySelectorAll(selector);
            for (const field of fields) {
                if (field.offsetParent !== null && !isInPluginContainer(field)) {
                    return field;
                }
            }
        }
        
        // 更广泛的搜索
        const allInputs = document.querySelectorAll('input[type="password"]');
        for (const input of allInputs) {
            if (input.offsetParent !== null && !isInPluginContainer(input)) {
                return input;
            }
        }
        
        return null;
    }

    findInputField(selectors, labelRegex) {
        // 排除插件自身的元素和搜索插件
        const pluginContainer = document.getElementById('floating-pw-panel');
        const searchContainer = document.getElementById('electron-search-bar');
        
        // 辅助函数：检查元素是否在插件容器内
        const isInPluginContainer = (element) => {
            return pluginContainer?.contains(element) || searchContainer?.contains(element);
        };
        
        // 先尝试精确匹配
        for (const selector of selectors) {
            const fields = document.querySelectorAll(selector);
            for (const field of fields) {
                if (field.type !== 'password' && 
                    field.offsetParent !== null && 
                    !isInPluginContainer(field)) {
                    return field;
                }
            }
        }

        // 如果没找到，尝试更广泛的搜索
        const allInputs = document.querySelectorAll('input');
        for (const input of allInputs) {
            if (input.type === 'password') continue;
            if (input.offsetParent === null) continue;
            if (isInPluginContainer(input)) continue;
            
            const lower = input.name.toLowerCase() + input.id.toLowerCase() + input.placeholder.toLowerCase();
            if (labelRegex.test(lower)) {
                return input;
            }
        }

        // 最后尝试通过label匹配
        for (const label of document.querySelectorAll('label')) {
            if (labelRegex.test(label.textContent)) {
                const inputId = label.getAttribute('for');
                const input = inputId ? document.getElementById(inputId) : label.querySelector('input');
                if (input?.offsetParent !== null && !isInPluginContainer(input)) {
                    return input;
                }
            }
        }

        return null;
    }

    getPassword(key) {
        const data = this.passwords[key];
        if (!data) {
            console.log('未找到密码数据，key:', key);
            return null;
        }
        
        try {
            let decodedPassword;
            
            // 检查是否是旧格式（直接存储的原始值）
            if (data.password && !this.isBase64Encoded(data.password)) {
                // 旧格式，直接使用原始值
                decodedPassword = data.password;
                console.log('检测到旧格式密码，直接使用原始值');
            } else {
                // 新格式，使用标准解码
                decodedPassword = decodeURIComponent(escape(atob(data.password)));
            }
            
            const decodedData = {
                ...data,
                password: decodedPassword
            };
            console.log('成功解码密码数据:', decodedData);
            return decodedData;
        } catch (e) {
            console.error('解码密码失败:', e);
            // 如果解码失败，尝试直接使用原始值
            const fallbackData = {
                ...data,
                password: data.password || ''
            };
            console.log('使用备用方案:', fallbackData);
            return fallbackData;
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

    copyPassword(key) {
        const password = this.getPassword(key);
        if (!password) return;

        navigator.clipboard.writeText(password.password).then(() => {
            this.showToast('密码已复制');
        }).catch(() => {
            // 备用复制方法
            const textArea = document.createElement('textarea');
            textArea.value = password.password;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('密码已复制');
        });
    }

    editPassword(key) {
        const password = this.getPassword(key);
        if (!password) return;

        const panel = document.getElementById('floating-pw-panel');
        
        // 创建编辑表单
        const editForm = document.createElement('div');
        editForm.id = 'edit-password-form';
        editForm.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 100;
            padding: 20px;
            display: flex;
            flex-direction: column;
        `;

        editForm.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">编辑密码</h3>
                <button id="cancel-edit-btn" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="flex: 1; overflow-y: auto;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #667eea;">主要标识（备注）：</label>
                    <input type="text" id="edit-notes" value="${password.notes || ''}" style="width: 100%; padding: 10px; border: 2px solid #667eea; border-radius: 4px; font-size: 16px; font-weight: 500;" placeholder="例如：百度网盘个人账号、公司邮箱等">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">网站域名：</label>
                    <input type="text" id="edit-domain" value="${password.domain}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">用户名：</label>
                    <input type="text" id="edit-username" value="${password.username}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">密码：</label>
                    <div style="position: relative;">
                        <input type="password" id="edit-password" value="${password.password}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; padding-right: 40px;">
                        <button type="button" id="toggle-edit-password-btn" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer;">👁️</button>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="update-password-btn" style="flex: 1; background: #667eea; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">更新</button>
                <button id="cancel-update-btn" style="flex: 1; background: #6c757d; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        `;

        panel.appendChild(editForm);

        // 绑定事件
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            editForm.remove();
        });

        document.getElementById('cancel-update-btn').addEventListener('click', () => {
            editForm.remove();
        });

        document.getElementById('toggle-edit-password-btn').addEventListener('click', () => {
            const passwordInput = document.getElementById('edit-password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                document.getElementById('toggle-edit-password-btn').textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                document.getElementById('toggle-edit-password-btn').textContent = '👁️';
            }
        });

        document.getElementById('update-password-btn').addEventListener('click', () => {
            const domain = document.getElementById('edit-domain').value.trim();
            const username = document.getElementById('edit-username').value.trim();
            const newPassword = document.getElementById('edit-password').value.trim();
            const notes = document.getElementById('edit-notes').value.trim();

            if (!domain || !username || !newPassword) {
                this.showToast('请填写完整信息');
                return;
            }

            // 删除旧记录，创建新记录
            localStorage.removeItem(key);
            this.savePassword(domain, username, newPassword, notes);
            editForm.remove();
        });
    }

    deletePassword(key) {
        if (confirm('确定要删除这个密码吗？')) {
            localStorage.removeItem(key);
            this.loadPasswords();
            this.showToast('密码已删除');
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            font-size: 14px;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    exportAllPasswords() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('pm-'));
        if (keys.length === 0) {
            this.showToast('暂无保存的密码');
            return;
        }

        const exportData = [];
        keys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                // 从key中提取域名（移除pm-前缀和用户名哈希后缀）
                const domain = key.replace(/^pm-/, '').replace(/-[a-zA-Z0-9+\/=]{8}$/, '');
                exportData.push({
                    domain: domain,
                    username: data.username,
                    password: data.password,
                    notes: data.notes || '',
                    created: data.created || new Date().toISOString()
                });
            } catch (e) {
                console.error('导出密码失败:', key, e);
            }
        });

        const exportText = JSON.stringify(exportData, null, 2);
        
        // 复制到剪贴板
        navigator.clipboard.writeText(exportText).then(() => {
            this.showToast(`已复制 ${exportData.length} 个密码到剪贴板`);
        }).catch(err => {
            console.error('复制失败:', err);
            // 降级方案：使用textarea
            const textarea = document.createElement('textarea');
            textarea.value = exportText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast(`已复制 ${exportData.length} 个密码到剪贴板`);
        });
    }

    importPasswords() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10003;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 20px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: #333;">批量导入密码</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                    请粘贴从剪贴板复制的密码数据（JSON格式），或手动输入符合格式的数据。
                </p>
                <textarea id="import-textarea" style="
                    width: 100%;
                    min-height: 180px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    resize: vertical;
                " placeholder='[{"domain":"example.com","username":"user","password":"pass","notes":"备注"}]'></textarea>
                
                <div style="margin: 15px 0;">
                    <label style="display: flex; align-items: center; font-size: 14px; color: #333;">
                        <input type="radio" name="import-mode" value="skip" checked style="margin-right: 8px;">
                        跳过已存在的密码
                    </label>
                    <label style="display: flex; align-items: center; font-size: 14px; color: #333; margin-top: 5px;">
                        <input type="radio" name="import-mode" value="overwrite" style="margin-right: 8px;">
                        覆盖已存在的密码
                    </label>
                    <label style="display: flex; align-items: center; font-size: 14px; color: #333; margin-top: 5px;">
                        <input type="radio" name="import-mode" value="merge" style="margin-right: 8px;">
                        合并更新（更新已存在但内容不同的密码）
                    </label>
                </div>
                
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-import-btn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">取消</button>
                    <button id="confirm-import-btn" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">确认导入</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 尝试从剪贴板读取数据
        navigator.clipboard.readText().then(text => {
            try {
                JSON.parse(text);
                document.getElementById('import-textarea').value = text;
            } catch (e) {
                // 剪贴板内容不是有效JSON，保持空值
            }
        }).catch(() => {
            // 剪贴板权限被拒绝，保持空值
        });

        // 取消按钮事件
        document.getElementById('cancel-import-btn').addEventListener('click', () => {
            modal.remove();
        });

        // 确认导入按钮事件
        document.getElementById('confirm-import-btn').addEventListener('click', () => {
            const importText = document.getElementById('import-textarea').value.trim();
            if (!importText) {
                this.showToast('请输入要导入的数据');
                return;
            }

            const importMode = document.querySelector('input[name="import-mode"]:checked').value;

            try {
                const importData = JSON.parse(importText);
                if (!Array.isArray(importData)) {
                    throw new Error('数据格式错误：应为数组格式');
                }

                let newCount = 0;
                let updateCount = 0;
                let skipCount = 0;
                let invalidCount = 0;

                importData.forEach(item => {
                    if (!item.domain || !item.username || !item.password) {
                        invalidCount++;
                        return;
                    }

                    const usernameHash = btoa(item.username).substring(0, 8);
                    const key = `pm-${item.domain}-${usernameHash}`;
                    const existing = localStorage.getItem(key);
                    
                    if (!existing) {
                        // 新密码，直接添加
                        const data = {
                            username: item.username,
                            password: btoa(unescape(encodeURIComponent(item.password))),
                            notes: item.notes || '',
                            domain: item.domain,
                            created: new Date().toISOString(),
                            updated: new Date().toISOString()
                        };
                        localStorage.setItem(key, JSON.stringify(data));
                        newCount++;
                    } else {
                        // 已存在的密码，根据模式处理
                        const existingData = JSON.parse(existing);
                        const isSame = existingData.username === item.username && 
                                     existingData.password === btoa(unescape(encodeURIComponent(item.password))) &&
                                     existingData.notes === (item.notes || '');
                        
                        switch (importMode) {
                            case 'skip':
                                skipCount++;
                                break;
                            case 'overwrite':
                                const data = {
                                    username: item.username,
                                    password: btoa(unescape(encodeURIComponent(item.password))),
                                    notes: item.notes || '',
                                    domain: item.domain,
                                    created: existingData.created,
                                    updated: new Date().toISOString()
                                };
                                localStorage.setItem(key, JSON.stringify(data));
                                updateCount++;
                                break;
                            case 'merge':
                                if (isSame) {
                                    // 内容完全相同，跳过
                                    skipCount++;
                                } else {
                                    // 内容不同，更新
                                    const data = {
                                        username: item.username,
                                        password: btoa(unescape(encodeURIComponent(item.password))),
                                        notes: item.notes || '',
                                        domain: item.domain,
                                        created: existingData.created,
                                        updated: new Date().toISOString()
                                    };
                                    localStorage.setItem(key, JSON.stringify(data));
                                    updateCount++;
                                }
                                break;
                        }
                    }
                });
                this.loadPasswords();
                modal.remove();
                
                const totalRecords = importData.length;
                 const successCount = newCount + updateCount;
                 const duplicateCount = skipCount;
                 
                 let message;
                 if (successCount === 0 && totalRecords > 0) {
                     message = `导入完成：共${totalRecords}条记录，${duplicateCount}条重复，${invalidCount}条无效，无新数据导入`;
                 } else {
                     message = `导入完成：共${totalRecords}条记录，成功导入${successCount}条`;
                     if (duplicateCount > 0) {
                         message += `，跳过重复${duplicateCount}条`;
                     }
                     if (invalidCount > 0) {
                         message += `，无效数据${invalidCount}条`;
                     }
                 }
                 
                 this.showToast(message);

            } catch (e) {
                this.showToast('导入失败：' + e.message);
            }
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    detectCurrentForm() {
        const usernameField = this.findUsernameField();
        const passwordField = this.findPasswordField();
        
        let message = '表单检测结果：\n\n';
        
        if (usernameField) {
            message += `用户名输入框：\n${this.getElementInfo(usernameField)}\n`;
            message += `当前值："${usernameField.value}"\n\n`;
        } else {
            message += '未找到用户名输入框\n\n';
        }
        
        if (passwordField) {
            message += `密码输入框：\n${this.getElementInfo(passwordField)}\n`;
            message += `当前值："${passwordField.value}"\n\n`;
        } else {
            message += '未找到密码输入框\n\n';
        }
        
        message += '提示：\n';
        message += '1. 如果密码输入框类型显示为"text"，这是正常的\n';
        message += '2. 点击"添加"按钮后，会弹出对话框让您确认信息\n';
        message += '3. 请确保输入域名、用户名和密码后再保存';
        
        alert(message);
    }

    getElementInfo(element) {
        const tag = element.tagName.toLowerCase();
        const type = element.type || '';
        const name = element.name || '';
        const id = element.id || '';
        const placeholder = element.placeholder || '';
        const className = element.className || '';
        
        return `${tag}[type=${type}, name=${name}, id=${id}, placeholder=${placeholder}, class=${className}]`;
    }

    bindEvents() {
        // 悬浮按钮点击事件
        document.getElementById('floating-pw-btn').addEventListener('click', () => {
            this.togglePanel();
        });

        // 关闭面板事件
        document.getElementById('close-panel-btn').addEventListener('click', () => {
            this.togglePanel();
        });

        // 添加密码事件
        document.getElementById('add-pw-btn').addEventListener('click', () => {
            this.showAddForm();
        });

        // 当前站点事件
        document.getElementById('current-site-btn').addEventListener('click', () => {
            // 查找当前域名的所有密码
            const currentDomainKeys = Object.keys(this.passwords).filter(key => 
                key.startsWith(`pm-${this.currentDomain}`)
            );
            
            if (currentDomainKeys.length === 1) {
                // 只有一个账号，直接填充
                this.fillForm(currentDomainKeys[0]);
            } else if (currentDomainKeys.length > 1) {
                // 多个账号，显示选择列表
                this.showAccountSelector(currentDomainKeys);
            } else {
                // 没有密码，显示添加表单
                this.showAddForm();
            }
        });

        // 检测表单事件
        document.getElementById('detect-form-btn').addEventListener('click', () => {
            this.detectCurrentForm();
        });

        // 导出所有密码事件
        document.getElementById('export-all-btn').addEventListener('click', () => {
            this.exportAllPasswords();
        });

        // 导入密码事件
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importPasswords();
        });

        // 搜索事件
        document.getElementById('search-pw').addEventListener('input', (e) => {
            this.renderPasswordList(e.target.value);
        });

        this.bindListEvents();

        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('floating-pw-panel');
            const button = document.getElementById('floating-pw-btn');
            if (this.isOpen && !panel.contains(e.target) && !button.contains(e.target)) {
                this.togglePanel();
            }
        });

        // ESC键关闭面板
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.togglePanel();
            }
        });
    }

    bindListEvents() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        listContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const key = button.getAttribute('data-key');
            if (!key) return;

            e.stopPropagation();

            const actionMap = {
                'fill-btn': () => this.fillForm(key),
                'copy-btn': () => this.copyPassword(key),
                'edit-btn': () => this.editPassword(key),
                'delete-btn': () => this.deletePassword(key)
            };

            for (const [className, action] of Object.entries(actionMap)) {
                if (button.classList.contains(className)) {
                    action();
                    break;
                }
            }
        });
    }

    showAccountSelector(keys) {
        // 创建账号选择器模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 300px;
            width: 90%;
            max-height: 400px;
            overflow-y: auto;
        `;

        content.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 15px;">选择要填充的账号</h3>
            <div id="account-list"></div>
            <button id="close-selector" style="margin-top: 15px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
        `;

        const listContainer = content.querySelector('#account-list');
        keys.forEach(key => {
            const password = this.passwords[key];
            if (password) {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 10px;
                    margin-bottom: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                `;
                item.onmouseover = () => item.style.backgroundColor = '#f8f9fa';
                item.onmouseout = () => item.style.backgroundColor = 'white';
                
                item.innerHTML = `
                    <div style="font-weight: bold;">${password.username}</div>
                    <div style="font-size: 12px; color: #666;">${password.domain}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.fillForm(key);
                    modal.remove();
                });
                
                listContainer.appendChild(item);
            }
        });

        content.querySelector('#close-selector').addEventListener('click', () => {
            modal.remove();
        });

        modal.appendChild(content);
        document.body.appendChild(modal);
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

// 初始化悬浮密码管理器
let floatingPwManager;

function initFloatingPasswordManager() {
    if (document.getElementById('floating-pw-btn')) return;
    floatingPwManager = new FloatingPasswordManager();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFloatingPasswordManager);
} else {
    initFloatingPasswordManager();
}