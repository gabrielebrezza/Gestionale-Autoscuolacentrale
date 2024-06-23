document.addEventListener('DOMContentLoaded', () => {
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const rows = document.querySelectorAll('.row');
    const filterFatture = () => {
        const fromDate = new Date(fromDateInput.value);
        
        const toDate = new Date(toDateInput.value); 
        for(const row of rows){
            const dataFattura = new Date(row.getElementsByTagName('td')[1].textContent.split('/').reverse().join('-'));
            if(fromDate <= dataFattura && dataFattura <= toDate){
                row.style.display = 'table-row'
            }else{
                row.style.display = 'none'
            }
        }
    }
    fromDateInput.addEventListener('change', filterFatture)
    toDateInput.addEventListener('change', filterFatture)
});