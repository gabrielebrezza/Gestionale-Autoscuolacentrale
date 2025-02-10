document.addEventListener('DOMContentLoaded', () => {
    const filterNome = document.getElementById('filterNome');
    const filterCognome = document.getElementById('filterCognome');
    const filterVisitaFrom = document.getElementById('filterVisitaFrom');
    const filterVisitaTo = document.getElementById('filterVisitaTo');
    const filterVisitaMancante = document.getElementById('filterVisitaMancante');
    const filterPatente = document.getElementById('filterPatente');
    const filterStatus = document.querySelectorAll('input[name="status"]');
    const filterRegistrazioneFrom = document.getElementById('filterRegistrazioneFrom');
    const filterRegistrazioneTo = document.getElementById('filterRegistrazioneTo');
    const filterEsameFrom = document.getElementById('filterEsameFrom');
    const filterEsameTo = document.getElementById('filterEsameTo');
    const tableBody = document.getElementById('usersTableBody');
    const rows = tableBody.getElementsByTagName('tr');

    function filterTable() {
        const nome = filterNome.value.toLowerCase();
        const cognome = filterCognome.value.toLowerCase();
        const patente = filterPatente.value.toLowerCase();
        const dataRegistrazioneDa = filterRegistrazioneFrom.value;
        const dataRegistrazioneA = filterRegistrazioneTo.value;
        const dataVisitaDa = filterVisitaFrom.value;
        const dataVisitaA = filterVisitaTo.value;
        const visitaMancante = filterVisitaMancante.checked;
        const dataEsameDa = filterEsameFrom.value;
        const dataEsameA = filterEsameTo.value;
        const status = document.querySelector('input[name="status"]:checked').value;
        console.log(status)
        let enumeration = 1;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const numTd = row.getElementsByTagName('td')[0].textContent.toLowerCase();
            const cognomeTd = row.getElementsByTagName('td')[1].textContent.toLowerCase();
            const nomeTd = row.getElementsByTagName('td')[2].textContent.toLowerCase();
            const patenteTd = row.getElementsByTagName('td')[6].textContent.toLowerCase();
            const visitaTd = row.getElementsByTagName('td')[5].textContent.toLowerCase().replace(/\s+/g, ' ').trim();
            const dataRegTd = row.getElementsByTagName('td')[7].textContent.toLowerCase().replace(/\s+/g, ' ').trim();
            const dataEsamiTd = row.getElementsByTagName('td')[8].textContent.toLowerCase().replace(/\s+/g, ' ').trim().split(' ');
            const isArchiviato = row.dataset.archiviato == 'true';
            let isDateEsameInRange;
            for (const esame of dataEsamiTd) {
                const dataEsame = new Date(esame.split('/').reverse().join('-'));
                const startEsameDate = new Date(dataEsameDa);
                const endEsameDate = new Date(dataEsameA);
                isDateEsameInRange = dataEsame >= startEsameDate && dataEsame <= endEsameDate;
                if (isDateEsameInRange) break;
            }
            let isDateVisitaInRange, isVisitaMancante;
            if (!visitaMancante) {
                const dataVisita = new Date(visitaTd.split('/').reverse().join('-').trim());
                const startVisitaDate = new Date(dataVisitaDa);
                const endVisitaDate = new Date(dataVisitaA);
                isDateVisitaInRange = dataVisita >= startVisitaDate && dataVisita <= endVisitaDate;
            } else {
                isVisitaMancante = visitaTd == 'mancante' ? true : false;
            }
            console.log(dataRegTd)
            const dataRegistrazione = new Date(dataRegTd.split('/').reverse().join('-').trim());
            console.log(dataRegistrazione)
            const startRegistrazioneDate = new Date(dataRegistrazioneDa);
            const endRegistrazioneDate = new Date(dataRegistrazioneA);

            const isDateRegInRange = dataRegistrazione >= startRegistrazioneDate && dataRegistrazione <= endRegistrazioneDate;
            console.log(dataRegistrazioneDa, dataRegistrazioneA, dataRegistrazione, 'registrazi/ESAME',dataEsameDa , dataEsameA)
            if (
                (nome === '' || nomeTd.includes(nome)) &&
                (cognome === '' || cognomeTd.includes(cognome)) &&
                (patente === '' || patenteTd.includes(patente) || patente == 'all') &&
                (dataRegistrazioneDa === '' || dataRegistrazioneA === '' || isDateRegInRange) &&
                (dataVisitaDa === '' || dataVisitaA === '' || isDateVisitaInRange) &&
                (!visitaMancante || isVisitaMancante) &&
                (dataEsameDa === '' || dataEsameA === '' || isDateEsameInRange) &&
                ((status == 'archived' && isArchiviato) || (status == 'all') || (status == 'active' && !isArchiviato))
            ) {
                row.getElementsByTagName('td')[0].querySelector('.numero').innerText = enumeration++;
                row.style.display = 'table-row';
            } else {
                row.style.display = 'none';
            }
        }
    }

    filterNome.addEventListener('input', filterTable);
    filterCognome.addEventListener('input', filterTable);
    filterPatente.addEventListener('input', filterTable);
    filterVisitaFrom.addEventListener('input', filterTable);
    filterVisitaTo.addEventListener('input', filterTable);
    filterRegistrazioneFrom.addEventListener('input', filterTable);
    filterRegistrazioneTo.addEventListener('input', filterTable);
    filterVisitaMancante.addEventListener('input', filterTable);
    filterEsameFrom.addEventListener('input', filterTable);
    filterEsameTo.addEventListener('input', filterTable);
    filterStatus.forEach(el => el.addEventListener('change', filterTable))
});