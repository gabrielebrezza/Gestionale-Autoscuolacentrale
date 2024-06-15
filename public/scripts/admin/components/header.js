document.addEventListener('DOMContentLoaded', () => {
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    const navBar = document.getElementById('navBar');
    const navBarItems = document.querySelector('#navBar ul')
    toggleMenuBtn.addEventListener('click', () => {
        toggleMenuBtn.style.rotate = toggleMenuBtn.style.rotate == '90deg' ? '0deg' : '90deg';
        navBar.style.width = navBar.style.width == '300px' ? 0 : '300px';
        navBarItems.style.display = navBarItems.style.display == 'block' ? 'none' : 'block';
        setTimeout(() =>{     
            navBarItems.style.opacity = navBarItems.style.opacity == 1 ? 0 : 1;
        }, 350); 
    });
});