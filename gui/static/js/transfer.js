window.addEventListener('DOMContentLoaded', () => {
    window.myApi.getGroupMenus().then((menus) => {
        updateMenu(menus.openMenus, "container");
        const wrapper = document.getElementById('container');
        wrapper.addEventListener('click', handleNavItemClick);
    })

    window.myUpload.init();
    window.myToast.init();
})

function handleNavItemClick(event){
    const isItemClicked = event.target.closest(".icon-item");
    if (!isItemClicked) return;

    let element = event.target;
    while (element && element !== event.currentTarget) {
        if (element.classList.contains('icon-item')) {
            window.myApi.openSite({url:element.dataset.url, name:element.dataset.name});
            break;
        }
        element = element.parentNode;
    }
}

function updateMenu(menus, pid) {
    const box = document.getElementById(pid);
    box.innerHTML="";
    menus.forEach(item => {
        let navItem = `
                <div data-url="${item.url}" data-name="${item.name}" class="icon-item">
                    <div class="icon"><img src="${item.img}" alt="${item.tag}"></div>
                    <span class="icon-label">${item.tag}</span>
                </div>
			`;
        box.innerHTML += navItem;
    });
}


