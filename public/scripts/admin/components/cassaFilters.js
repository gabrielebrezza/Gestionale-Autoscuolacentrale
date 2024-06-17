document.addEventListener('DOMContentLoaded', () => {
    const causaFilter = document.getElementById('causaFilter');
    const fromDateFilter = document.getElementById('fromDate');
    const toDateFilter = document.getElementById('toDate');
    const entrataFilter = document.getElementById('entrataFilter');
    const uscitaFilter = document.getElementById('uscitaFilter');
    const rows = document.querySelectorAll('.row');
    
    const filterTransazioni = () => {
        const causa = causaFilter.value;

        const fromDate = new Date(fromDateFilter.value);
        
        const toDate = new Date(toDateFilter.value); 
        for(const row of rows){
            const causaTdValue = row.getElementsByTagName('td')[2].textContent;
            const dataTransazione = new Date(row.getElementsByTagName('td')[2].textContent.split('/').reverse().join('-'));
            const tipoSpesa = row.getElementsByTagName('td')[4].textContent.toLocaleLowerCase();
            console.log(tipoSpesa == 'entrata' && entrataFilter.checked)
            console.log(tipoSpesa == 'uscita' && uscitaFilter.checked)
            const spesaFiltrata = tipoSpesa == 'entrata' && entrataFilter.checked ? true : tipoSpesa == 'uscita' && uscitaFilter.checked ? true : false;
            if(
                ((fromDate <= dataTransazione && dataTransazione <= toDate) || 
                 (!fromDateFilter.value || !toDateFilter.value)) &&
                (spesaFiltrata) && (causa === '' || causaTdValue.includes(causa))
            ){
                row.style.display = 'table-row'
            }else{
                row.style.display = 'none'
            }
        }
    }
    
    causaFilter.addEventListener('change', filterTransazioni);
    fromDateFilter.addEventListener('change', filterTransazioni);
    toDateFilter.addEventListener('change', filterTransazioni);
    entrataFilter.addEventListener('change', filterTransazioni);
    uscitaFilter.addEventListener('change', filterTransazioni);
});
