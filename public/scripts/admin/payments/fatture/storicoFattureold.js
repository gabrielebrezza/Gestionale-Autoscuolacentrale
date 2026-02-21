document.addEventListener('DOMContentLoaded', () => {
    const typeInput = document.getElementById('tipo');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const userInput = document.getElementById('user');
    const rows = document.querySelectorAll('.row');
    const filterFatture = () => {
        const fromDate = new Date(fromDateInput.value);
        const tipo = typeInput.value;
        const toDate = new Date(toDateInput.value); 
        const user = userInput.value.toLowerCase();
        const regexUser = new RegExp(user, "i");
        for(const row of rows){
            const dataFattura = new Date(row.getElementsByTagName('td')[2].textContent.split('/').reverse().join('-'));
            const tipoFattura = row.getElementsByTagName('td')[4].textContent.replace('IT06498290011_', '').startsWith(tipo);
            const userFattura = row.getElementsByTagName('td')[5].textContent.toLowerCase();
            if(((fromDate <= dataFattura && dataFattura <= toDate) || !fromDateInput.value  || !toDateInput.value) &&
                (tipoFattura || tipo == 'all') && (regexUser.test(userFattura) || user === "")
            ){
                row.style.display = 'table-row'
            }else{
                row.style.display = 'none'
            }
        }
    }
    fromDateInput.addEventListener('change', filterFatture);
    toDateInput.addEventListener('change', filterFatture);
    typeInput.addEventListener('change', filterFatture);
    userInput.addEventListener('input', filterFatture)
});