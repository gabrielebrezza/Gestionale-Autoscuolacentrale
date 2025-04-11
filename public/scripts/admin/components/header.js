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
    document.addEventListener('click', e => {
        if(!navBar.contains(e.target) && toggleMenuBtn != e.target){
            toggleMenuBtn.style.rotate = '0deg';
            navBar.style.width = 0;
            navBarItems.style.display ='none';
            setTimeout(() =>{     
                navBarItems.style.opacity = 0;
            }, 350);
        }
        document.querySelectorAll('details').forEach(details => {
            if (details.open && !details.contains(e.target)) {
                details.removeAttribute('open')
            }
        });
        const filterRinnovi = document.getElementById('filterRinnovi');
        const filterRinnoviBtn = document.getElementById('filterRinnoviBtn');
        if(filterRinnovi && filterRinnoviBtn){
            if (!filterRinnovi.contains(e.target) && !filterRinnoviBtn.contains(e.target)) {
                filterRinnovi.style.height = '0px';
                setTimeout(() => {
                    filterRinnovi.style.opacity = 0;
                },200);
            }
        }
    })
});