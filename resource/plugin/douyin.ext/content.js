const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    if (tagName.toLowerCase() === 'iframe') {
        Object.defineProperty(element, 'src', {
            set: function(value) {
                if (value && value.startsWith('bitbrowser:')) {
                    throw new Error('Setting iframe src to bitbrowser protocol is not allowed');
                }
                Object.defineProperty(this, 'src', {
                    value: value,
                    writable: true,
                    configurable: true
                });
            },
            get: function() {
                return this.getAttribute('src');
            },
            configurable: true
        });
    }
    return element;
};