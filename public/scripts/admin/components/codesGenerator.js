document.addEventListener('DOMContentLoaded', () => {
    const genCode = document.getElementById('genCode');
    const codesForm = document.getElementById('codesForm');
    const closeCodeFormBtn = document.getElementById('closeCodeFormBtn');
    genCode.addEventListener('click', () => {
        codesForm.style.display = 'flex';
    });
    closeCodeFormBtn.addEventListener('click', () => {
        codesForm.style.display = 'none';
    });
    
    codesForm.addEventListener('submit', function(event) {
        event.preventDefault();
    
        const email = document.getElementById('email').value;        
        const cf = document.getElementById('cf').value;
    
        const confirmed = confirm(`Sei sicuro di voler creare un codice per l'allievo con codice fiscale ${cf} e email ${email}`);
        if (!confirmed) {
            return;
        }
    
        const formData = {
            email: email,
            cf: cf,
            patente: document.getElementById('patente').value,
            iscrizione: document.getElementById('iscrizione').value
        };
        fetch('/createCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Codice generato con successo. Il codice è: ${data.code}. Il costo è di ${data.importo}€`);
            } else {
                alert(`Errore nella generazione del codice: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Errore:', error);
            alert('Si è verificato un errore durante la generazione del codice.');
        });
    });
});