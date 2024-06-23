document.addEventListener('DOMContentLoaded', () => {
    const codiceDestinatarioInput = document.getElementById('codiceDestinatario');
    const nomeClienteInput = document.getElementById('nomeCliente');
    const cognomeClienteInput = document.getElementById('cognomeCliente');
    const codiceFiscaleClienteInput = document.getElementById('codiceFiscaleCliente');
    const emailClienteInput = document.getElementById('emailCliente');
    const indirizzoSedeClienteInput = document.getElementById('indirizzoSedeCliente');
    const capSedeClienteInput = document.getElementById('capSedeCliente');
    const comuneSedeClienteInput = document.getElementById('comuneSedeCliente');
    const provinciaSedeClienteInput = document.getElementById('provinciaSedeCliente');
    const nazioneSedeClienteInput = document.getElementById('nazioneSedeCliente');
    const IdPaeseClienteInput = document.getElementById('IdPaeseCliente');
    const partitaIvaClienteInput = document.getElementById('partitaIvaCliente');
    const clientRadioBtn = document.querySelectorAll('.clientRadioBtn');
    for (const btn of clientRadioBtn) {
        btn.addEventListener('change', () => {
            if (btn.checked) {
                const data = btn.dataset.dati ? JSON.parse(btn.dataset.dati) : '';
                if(data != ''){
                    codiceDestinatarioInput.value = data.cDestinatario;
                    nomeClienteInput.value = data.nome;
                    cognomeClienteInput.value = data.cognome;
                    codiceFiscaleClienteInput.value = data.cFiscale;
                    emailClienteInput.value = data.email;
                    indirizzoSedeClienteInput.value = data.residenza.indirizzo;
                    capSedeClienteInput.value = data.residenza.cap;
                    comuneSedeClienteInput.value = data.residenza.comune;
                    provinciaSedeClienteInput.value = data.residenza.provincia;
                    nazioneSedeClienteInput.value = data.residenza.nazione;
                    IdPaeseClienteInput.value = data.idPaese;
                    partitaIvaClienteInput.value = data.pIva;
                }else{
                    codiceDestinatarioInput.value = '';
                    nomeClienteInput.value = '';
                    cognomeClienteInput.value = '';
                    codiceFiscaleClienteInput.value = '';
                    emailClienteInput.value = '';
                    indirizzoSedeClienteInput.value = '';
                    capSedeClienteInput.value = '';
                    comuneSedeClienteInput.value = '';
                    provinciaSedeClienteInput.value = '';
                    nazioneSedeClienteInput.value = '';
                    IdPaeseClienteInput.value = '';
                    partitaIvaClienteInput.value = '';
                }
                
            }
        });
    }
    const detailsCliente = document.querySelectorAll('.cliente');
    for(const details of detailsCliente){
        details.addEventListener('toggle', () => {
            if (details.open) {
                for (const otherDetails of detailsCliente) {
                    if (otherDetails !== details) {
                        otherDetails.removeAttribute('open');
                    }
                }
            }
        });
    }
});