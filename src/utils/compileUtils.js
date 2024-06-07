const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const utenti = require('../DB/User');

async function compilaTt2112(cFiscale) {
    try {
      const data = await utenti.findOne({"cFiscale": cFiscale});

      const patenteRichiesta = data.patente.find(patente => patente.bocciato === null)?.tipo;
      const existingPdfBytes = await fs.readFile('public/download/tt2112.pdf');
  
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
      const form = pdfDoc.getForm();

      form.getTextField('Codice Autoscuola / Agenzia').setText('0013');
      form.getTextField('UMC').setText('TORINO')
      form.getTextField('Cognome').setText(data.cognome);
      form.getTextField('Nome').setText(data.nome);
      form.getTextField('Luogo di nascita').setText(data.nascita.comune);
      form.getTextField('Provincia_nascita').setText(data.nascita.provincia == 'EE' ? '': data.nascita.provincia);
      form.getTextField('Stato').setText(data.nascita.stato);
      form.getTextField('Data Nascita').setText(data.nascita.data);
      form.getTextField('Codice fiscale').setText(data.cFiscale);
      form.getTextField('Luogo di residenza').setText(data.residenza.comune);
      form.getTextField('Indirizzo').setText(data.residenza.via); 
      form.getTextField('Numero Civico').setText(data.residenza.nCivico);
      form.getTextField('Provincia_residenza').setText(data.residenza.provincia);
      form.getTextField('CAP').setText(data.residenza.cap);
      form.getTextField('Sesso').setText(data.sesso);
      form.getCheckBox('Foglio Rosa').check(); 
      form.getTextField('Cat. richiesta').setText(patenteRichiesta);
      const pdfBytes = await pdfDoc.save();

      const savePath = path.join('certificati', 'tt2112', `tt2112_${data.cFiscale}.pdf`);

      await fs.mkdir(path.dirname(savePath), { recursive: true });
      
      await fs.writeFile(savePath, pdfBytes);
      return;
    } catch (error) {
      throw new Error(`Errore durante la compilazione del modulo PDF: ${error.message}`);
    }
  }

module.exports = compilaTt2112