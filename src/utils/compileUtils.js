const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const utenti = require('../DB/User');
const Duplicati = require('../DB/Duplicati');
const rinnovi = require('../DB/Rinnovi');

async function compilaTt2112(id) {
    try {
      let data = await utenti.findOne({"_id": id});
      let duplicato = !data;
      if(duplicato){
        data = await Duplicati.findOne({"_id": id});
      }
      let patenteRichiesta;
      if(duplicato){
        patenteRichiesta = data.patenteRichiesta;
      }else{
        patenteRichiesta = data.patente.find(patente => patente.bocciato === null)?.tipo;
      }
      
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
      form.getTextField('Codice fiscale').setText(duplicato ? data.cf : data.cFiscale);
      form.getTextField('Luogo di residenza').setText(data.residenza.comune);
      form.getTextField('Indirizzo').setText(data.residenza.via); 
      form.getTextField('Numero Civico').setText(data.residenza.nCivico);
      form.getTextField('Provincia_residenza').setText(data.residenza.provincia);
      form.getTextField('CAP').setText(data.residenza.cap);
      form.getTextField('Sesso').setText(data.sesso);
      if(duplicato){
        form.getCheckBox('Duplicato').check();
        form.getTextField('Cat. richiesta_1').setText(patenteRichiesta);
      }else{
        form.getCheckBox('Foglio Rosa').check();
        form.getTextField('Cat. richiesta').setText(patenteRichiesta);
      }
      
      const pdfBytes = await pdfDoc.save();

      const savePath = path.join('certificati', 'tt2112', `tt2112_${id}.pdf`);

      await fs.mkdir(path.dirname(savePath), { recursive: true });
      
      await fs.writeFile(savePath, pdfBytes);
      return;
    } catch (error) {
      throw new Error(`Errore durante la compilazione del modulo PDF: ${error.message}`);
    }
  }


  async function compilaCertResidenza(id) {
    return new Promise(async (resolve, reject) => {
      try {
          const data = await utenti.findOne({"_id": id});
  
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
          await fs.writeFile(`./certificati/residenza/residenza_${id}.pdf`, pdfBytes);
          resolve(`autocertificazione di residenza salvata con successo`);
        }catch (error) {
          reject(error);
      }
    });
  }






  async function compilaVmRinnovo(id) {
    return new Promise(async (resolve, reject) => {
      try {
          const data = await rinnovi.findOne({"_id": id});
  
          const existingPdfBytes = await fs.readFile('./public/download/vmRinnovo.pdf');
  
          const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          const intestazionePosition = { x: 65, y: 800, lineHeight: 10};
          const numProtocolloPosition = { x: 65, y: 737 };
          const codAgenziaPosition = { x: 453, y: 737 };
          const nomeCognomePosition = { x: 130, y: 610 };
          // const luogoNascitaPosition = { x: 105, y: 587 };
          // const provinciaNascitaPosition = { x: 360, y: 587 };
          // const dataNascitaPosition = { x: 430, y: 587 };
          const tipoDocumentoPosition = { x: 200, y: 570 };
          const provinciaResidenzaPosition = { x: 400, y: 570 };
          let nProtocollo = '';
          data.protocollo.split('').forEach(letter => nProtocollo+= `${letter} `);
          const intestazione = `CF: ${data.cf} \nIndirizzo Di Spedizione: \n${data.spedizione.via} ${data.spedizione.nCivico} \n${data.spedizione.cap} (${data.spedizione.provincia})`

          intestazione.split('\n').forEach((linea) => {
            firstPage.drawText(linea, {
              x: intestazionePosition.x,
              y: intestazionePosition.y,
              size: 8,
              color: rgb(0, 0, 0),
            });
            intestazionePosition.y -= intestazionePosition.lineHeight;
          });

          firstPage.drawText(nProtocollo, {
            x: numProtocolloPosition.x,
            y: numProtocolloPosition.y,
            size: 25,
            color: rgb(0, 0, 0),
          });

          firstPage.drawText(`0 0 1 3`, {
            x: codAgenziaPosition.x,
            y: codAgenziaPosition.y,
            size: 25,
            color: rgb(0, 0, 0),
          });

          firstPage.drawText(`${data.cognome} ${data.nome}`, {
            x: nomeCognomePosition.x,
            y: nomeCognomePosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          // firstPage.drawText(data.nascita.comune, {
          //   x: luogoNascitaPosition.x,
          //   y: luogoNascitaPosition.y,
          //   size: 12,
          //   color: rgb(0, 0, 0),
          // });
          // firstPage.drawText(data.nascita.provincia, {
          //   x: provinciaNascitaPosition.x,
          //   y: provinciaNascitaPosition.y,
          //   size: 12,
          //   color: rgb(0, 0, 0),
          // });
          // firstPage.drawText(data.nascita.data, {
          //   x: dataNascitaPosition.x,
          //   y: dataNascitaPosition.y,
          //   size: 12,
          //   color: rgb(0, 0, 0),
          // });
          firstPage.drawText('patente', {
            x: tipoDocumentoPosition.x,
            y: tipoDocumentoPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          firstPage.drawText(data.nPatente, {
            x: provinciaResidenzaPosition.x,
            y: provinciaResidenzaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
          // firstPage.drawText(`${data.residenza.via} ${data.residenza.nCivico}`, {
          //   x: indirizzoPosition.x,
          //   y: indirizzoPosition.y,
          //   size: 12,
          //   color: rgb(0, 0, 0),
          // });
        
          const pdfBytes = await pdfDoc.save();
          await fs.writeFile(`./certificati/vmRinnovo/vmRinnovo_${id}.pdf`, pdfBytes);
          resolve(`autocertificazione di residenza salvata con successo`);
        }catch (error) {
          reject(error);
      }
    });
  }

module.exports = {compilaTt2112, compilaCertResidenza, compilaVmRinnovo}