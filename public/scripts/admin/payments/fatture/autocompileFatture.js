document.addEventListener('DOMContentLoaded', () => {
    const ImportoTotaleDocumento = document.getElementById('ImportoTotaleDocumento');
    const prezzoUnitario2Input = document.getElementById('prezzoUnitario2');
    function autocompleteImports(){
        const importo = Number(ImportoTotaleDocumento.value).toFixed(2);
        const prezzoUnitario2 = Number(prezzoUnitario2Input.value).toFixed(2);
        if(importo != 0 && prezzoUnitario2 != 0){
            const prezzoUnitario1 = document.getElementById('prezzoUnitario1');
            const prezzoTotale1 = document.getElementById('prezzoTotale1');
            const prezzoTotale2 = document.getElementById('prezzoTotale2');
            const imponibileImporto1 = document.getElementById('imponibileImporto1');
            const imposta1 = document.getElementById('imposta1');
            const imponibileImporto2 = document.getElementById('imponibileImporto2');
            const importoPagamento = document.getElementById('importoPagamento');
            prezzoUnitario1.value = ((importo-prezzoUnitario2)/1.22).toFixed(2)
            prezzoTotale1.value = prezzoUnitario1.value;
            imponibileImporto1.value = prezzoUnitario1.value;
            imponibileImporto2.value = prezzoUnitario2;
            prezzoTotale2.value = prezzoUnitario2;
            prezzoUnitario2Input.value = prezzoUnitario2;
            ImportoTotaleDocumento.value = importo;
            importoPagamento.value = importo;
            imposta1.value = (((prezzoUnitario1.value)*22)/100).toFixed(2);
        }
    }

    prezzoUnitario2Input.addEventListener('change', autocompleteImports);
    ImportoTotaleDocumento.addEventListener('change', autocompleteImports);
});