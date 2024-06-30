document.addEventListener('DOMContentLoaded', () => {
    const typeInput = document.getElementById('tipo');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const rows = document.querySelectorAll('.row');
    const filterFatture = () => {
        const fromDate = new Date(fromDateInput.value);
        const tipo = typeInput.value;
        const toDate = new Date(toDateInput.value); 
        for(const row of rows){
            const dataFattura = new Date(row.getElementsByTagName('td')[2].textContent.split('/').reverse().join('-'));
            const tipoFattura = row.getElementsByTagName('td')[4].textContent.replace('IT06498290011_', '').startsWith(tipo);
            if(((fromDate <= dataFattura && dataFattura <= toDate) || !fromDateInput.value  || !toDateInput.value) &&
                (tipoFattura || tipo == 'all')
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
});