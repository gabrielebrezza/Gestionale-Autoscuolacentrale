const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, StandardFonts} = require('pdf-lib');
const exceljs = require('exceljs');

const utenti = require('../DB/User');
const Duplicati = require('../DB/Duplicati');
const rinnovi = require('../DB/Rinnovi');


async function creaGiornale(users) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
  const pageCount = 50;
  const lineHeight = 14;
  const startY = 730;
  const marginLeft = 30;

  const columns = [
    { name: "N. operaz.", width: 50 },
    { name: "Data Incarico", width: 75 },
    { name: "Committente (Identificazione)", width: 150 },
    { name: "Natura dell'incarico", width: 130 },
    { name: "Data ricevuta documento", width: 130 }
  ];

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595, 842]); // Portrait A4
    const { width, height } = page.getSize();

    // Numero pagina in alto a sinistra
    page.drawText(`${i + 1}`, {
      x: 10,
      y: height - 25,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });

      page.drawText("Registro Giornale", {
        x: width / 2 - font.widthOfTextAtSize("Registro Giornale", 18) / 2,
        y: height - 60,
        size: 18,
        font: titleFont,
      });
      page.drawText("Impresa di consulenza per la Circolazione dei Mezzi di Trasporto", {
        x: width / 2 - font.widthOfTextAtSize("Impresa di consulenza per la Circolazione dei Mezzi di Trasporto", 12) / 2,
        y: height - 85,
        size: 12,
        font,
      });

    // Colonne
    let currentX = marginLeft;
    columns.forEach(col => {
      page.drawText(col.name, {
        x: currentX + 2,
        y: height - 110,
        size: 10,
        font,
      });
      page.drawLine({
        start: { x: currentX, y: height - 100 },
        end: { x: currentX, y: 40 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      currentX += col.width;
    });

    // Linea destra
    page.drawLine({
      start: { x: currentX, y: height - 100 },
      end: { x: currentX, y: 40 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    // Riga intestazione orizzontale
    page.drawLine({
      start: { x: marginLeft, y: height - 100 },
      end: { x: currentX, y: height - 100 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    // Riga fondo
    page.drawLine({
      start: { x: marginLeft, y: 40 },
      end: { x: currentX, y: 40 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    // Righe orizzontali corpo
    let y;
    for (let j = 0; j < 49; j++) {
      y = startY - j * lineHeight;
      if (y < 50) break;
      const userIndex = j + 49 * i;
      if(userIndex < users.length){
        const rowData = [
          `${1 + userIndex}`,
          users[userIndex].visita.data.toLocaleDateString('it-IT'),
          `${users[userIndex].nome.toUpperCase()} ${users[userIndex].cognome.toUpperCase()}`,
          'Rinnovo Patente',
          users[userIndex].visita.data.toLocaleDateString('it-IT')
        ]
        columns.forEach((c, colIndex) => {
          const xShift =  columns
          .slice(0, colIndex)
          .reduce((acc, col) => acc + col.width, 0);
          page.drawText(`${rowData[colIndex]}`, {
            x: marginLeft + xShift + 2,
            y: y-10,
            size: 8,
            font,
            color: rgb(0, 0, 0),
          });
        });
      }
      page.drawLine({
        start: { x: marginLeft, y },
        end: { x: currentX, y },
        thickness: 0.2,
        color: rgb(0, 0, 0),
      });
    }
    page.drawText("Autoscuola Centrale di D'Amelio Antonio C.so Marconi 33 10125 Torino(TO) P.IVA: 06498290011", {
      x: width / 2 - font.widthOfTextAtSize("Autoscuola Centrale di D'Amelio Antonio C.so Marconi 33 10125 Torino(TO) P.IVA: 06498290011", 10) / 2,
      y: 8,
      size: 10,
      font,
    });
  }

  console.log("PDF creato con successo.");
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function creaGiornaleExcel(users) {
  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Giornale');

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
  const headerFont = { bold: true };
  const headers = ["N. operaz.", "Data Incarico", "Committente (Identificazione)", "Natura dell'incarico", "Data ricevuta documento"];
  const columns = [];

  headers.forEach(h => columns.push({ header: h, key: h, width: 50 }));

  worksheet.columns = columns;

  const headerRow = worksheet.getRow(1);
  headerRow.fill = headerFill;
  headerRow.font = headerFont;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  users.forEach((u, index) => {
      const row = [
          index+1,
          u.visita.data.toLocaleDateString('it-IT'),
          `${u.nome.toUpperCase()} ${u.cognome.toUpperCase()}`,
          'Rinnovo Patente',
          u.visita.data.toLocaleDateString('it-IT')
      ]
      const rowNumber = worksheet.addRow(row).number;
      worksheet.getRow(rowNumber).height = 20;
  
      worksheet.getRow(rowNumber).eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
  })
  console.log("Excel creato con successo.");
  return workbook.xlsx;
}

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
      console.log(data)
      form.getTextField('Codice Autoscuola / Agenzia').setText('0013');
      form.getTextField('UMC').setText('TORINO')
      form.getTextField('Cognome').setText(data.cognome.toUpperCase());
      form.getTextField('Nome').setText(data.nome.toUpperCase());
      form.getTextField('Luogo di nascita').setText(data.nascita.comune.toUpperCase());
      form.getTextField('Provincia_nascita').setText(data.nascita.provincia == 'EE' ? '': data.nascita.provincia.toUpperCase());
      form.getTextField('Stato').setText(data.nascita.stato ? data.nascita.stato.toUpperCase() : '');
      form.getTextField('Data Nascita').setText(data.nascita.data);
      form.getTextField('Codice fiscale').setText(duplicato ? data.cf : data.cFiscale.toUpperCase());
      form.getTextField('Luogo di residenza').setText(data.residenza.comune.toUpperCase());
      form.getTextField('Indirizzo').setText(data.residenza.via.toUpperCase()); 
      form.getTextField('Numero Civico').setText(String(data.residenza.nCivico).toUpperCase());
      form.getTextField('Provincia_residenza').setText(data.residenza.provincia.toUpperCase());
      form.getTextField('CAP').setText(data.residenza.cap);
      form.getTextField('Sesso').setText(data.sesso);
      if(duplicato){
        form.getCheckBox('Duplicato').check();
        form.getTextField('Cat. richiesta_1').setText(patenteRichiesta.toUpperCase());
      }else{
        form.getCheckBox('Foglio Rosa').check();
        form.getTextField('Cat. richiesta').setText(patenteRichiesta.toUpperCase());
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
        firstPage.drawText(`${data.cognome.toUpperCase()} ${data.nome.toUpperCase()}`, {
          x: nomeCognomePosition.x,
          y: nomeCognomePosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(data.nascita.comune.toUpperCase(), {
          x: luogoNascitaPosition.x,
          y: luogoNascitaPosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(data.nascita.provincia.toUpperCase(), {
          x: provinciaNascitaPosition.x,
          y: provinciaNascitaPosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(data.nascita.data.toUpperCase(), {
          x: dataNascitaPosition.x,
          y: dataNascitaPosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(data.residenza.comune.toUpperCase(), {
          x: comuneResidenzaPosition.x,
          y: comuneResidenzaPosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(data.residenza.provincia.toUpperCase(), {
          x: provinciaResidenzaPosition.x,
          y: provinciaResidenzaPosition.y,
          size: 12,
          color: rgb(0, 0, 0),
        });
        firstPage.drawText(`${data.residenza.via.toUpperCase()} ${data.residenza.nCivico.toUpperCase()}`, {
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
          if(!data.nPatente){
            return reject('Numero Patente undefined');
          }
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
          if(data.protocollo){
            data.protocollo.split('').forEach(letter => nProtocollo+= `${letter} `);
          }
          
          const intestazione = `CF: ${data.cf} \nIndirizzo Di Spedizione: \n${data.spedizione.via.toUpperCase()} ${data.spedizione.nCivico.toUpperCase()} \n${data.spedizione.cap} ${data.spedizione.comune.toUpperCase()} (${data.spedizione.provincia.toUpperCase()})`

          intestazione.split('\n').forEach((linea) => {
            firstPage.drawText(linea, {
              x: intestazionePosition.x,
              y: intestazionePosition.y,
              size: 8,
              color: rgb(0, 0, 0),
            });
            intestazionePosition.y -= intestazionePosition.lineHeight;
          });

          firstPage.drawText(nProtocollo.toUpperCase(), {
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

          firstPage.drawText(`${data.cognome.toUpperCase()} ${data.nome.toUpperCase()}`, {
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
          firstPage.drawText(data.nPatente.toUpperCase(), {
            x: provinciaResidenzaPosition.x,
            y: provinciaResidenzaPosition.y,
            size: 12,
            color: rgb(0, 0, 0),
          });
        
          const pdfBytes = await pdfDoc.save();
          await fs.writeFile(`./certificati/vmRinnovo/vmRinnovo_${id}.pdf`, pdfBytes);
          resolve(`autocertificazione di residenza salvata con successo`);
        }catch (error) {
          reject(error);
        }
    });
  }

module.exports = {creaGiornale, creaGiornaleExcel, compilaTt2112, compilaCertResidenza, compilaVmRinnovo}