const submitBtn = document.getElementById('submitBtn');
submitBtn.addEventListener('click', () => {
    setTimeout(()=> {
        submitBtn.disabled = true;
    }, 5);
});