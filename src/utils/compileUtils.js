const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

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


  async function compilaCertResidenza(cFiscale) {
    return new Promise(async (resolve, reject) => {
      try {
          const data = await utenti.findOne({"cFiscale": cFiscale});
  
          const existingPdfBytes = await fs.readFile('./public/download/autocertificazioneResidenza.pdf');
  
          const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
  
          const nomeCognomePosition = { x: 190, y: 605 };
          const luogoNascitaPosition = { x: 100, y: 583 };
          const provinciaNascitaPosition = { x: 263, y: 583 };
          const dataNascitaPosition = { x: 310, y: 583 };
          const comuneResidenzaPosition = { x: 240, y: 375 };
          const provinciaResidenzaPosition = { x: 470, y: 375 };
          const indirizzoPosition = { x: 140, y: 355 };

          firstPage.drawText(`${data.cognome} ${data.nome}`, {
            x: nomeCognomePosition.x,
            y: nomeCognomePosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.nascita.comune, {
            x: luogoNascitaPosition.x,
            y: luogoNascitaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.nascita.provincia, {
            x: provinciaNascitaPosition.x,
            y: provinciaNascitaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.nascita.data, {
            x: dataNascitaPosition.x,
            y: dataNascitaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.residenza.comune, {
            x: comuneResidenzaPosition.x,
            y: comuneResidenzaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.residenza.provincia, {
            x: provinciaResidenzaPosition.x,
            y: provinciaResidenzaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(`${data.residenza.via} ${data.residenza.nCivico}`, {
            x: indirizzoPosition.x,
            y: indirizzoPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
        
          const pdfBytes = await pdfDoc.save();
          await fs.writeFile(`./certificati/residenza/autocertificazioneResidenza_${cFiscale}.pdf`, pdfBytes);
          resolve(`autocertificazione di residenza salvata con successo`);
        }catch (error) {
          reject(error);
      }
    });
  }



module.exports = {compilaTt2112, compilaCertResidenza}