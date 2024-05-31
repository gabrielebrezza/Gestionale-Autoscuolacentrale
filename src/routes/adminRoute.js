const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const sharp = require('sharp');
const { create } = require('xmlbuilder2');
const PDFDocument = require('pdfkit');
const router = express.Router();

//databases
const admins = require('../DB/Admin');
const utenti = require('../DB/User');
const prezzi = require('../DB/Prezzi');
const numeroFattura = require('../DB/numeroFattura');
//functions
const sendEmail = require('../utils/emailsUtils.js');
const sendMessage = require('../utils/messagesUtils.js');
router.get('/admin', async (req, res) =>{
    const users = await utenti.find({});
    res.render('admin/usersPage', {users})
});
router.get('/userPage', async (req, res) =>{
    const user = await utenti.findOne({"cFiscale": req.query.cf});
    if(!user){
        return res.render('errorPage',{error: 'utente non trovato'});
    }
    res.render('admin/userPage',{user});
});
const storage = multer.memoryStorage();

const uploadProfilePic = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
      return cb(new Error('Solo file JPG, JPEG, o PNG sono consentiti!'));
    }
    cb(null, true);
  }
}).single('inputProfileFile');

router.post('/uploadUserImage', (req, res) => {

    uploadProfilePic(req, res, async function (err) {
    if (err) {
      return res.status(400).send(err.message);
    }
    if(!req.file){
        return res.render('errorPage',{error: 'Nessuna immagine caricata'});
    }
    const cf = req.body.cf; 
    const file = req.file;
 
    const webpBuffer = await sharp(file.buffer)
    .resize({ width: 260, height: 315, fit: 'cover', position: 'center' })
      .toFormat('jpg')
      .toBuffer();

    const fileName = cf + '_' + Date.now() + '.jpg';
    const filePath = 'public/img/profileImages/' + fileName;

    fs.writeFile(filePath, webpBuffer, async (err) => {
      if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
      }

      const existingUser = await utenti.findOne({ cFiscale: cf });
      if (existingUser && existingUser.immagineProfilo) {
        const imagePath = 'public/img/profileImages/' + existingUser.immagineProfilo;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      await utenti.findOneAndUpdate({ cFiscale: cf }, { immagineProfilo: fileName });
      

      res.redirect(req.get('referer'));
    });
  });
});


const uploadFirmaPic = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
      return cb(new Error('Solo file JPG, JPEG, o PNG sono consentiti!'));
    }
    cb(null, true);
  }
}).single('inputSigningFile');

router.post('/uploadUserFirma', async (req, res) => {
  uploadFirmaPic(req, res, async function (err) {
    if (err) {
      return res.status(400).send(err.message);
    }
    const { cf, croppedImage } = req.body;

    if (!croppedImage) {
      return res.render('errorPage', { error: 'Nessuna immagine caricata' });
    }

    const matches = croppedImage.match(/^data:image\/(jpeg|png);base64,(.+)$/);
    if (!matches) {
      return res.status(400).send('Formato immagine non valido');
    }
    const imageBuffer = Buffer.from(matches[2], 'base64');

    const fileName = `${cf}_${Date.now()}.jpg`;
    const filePath = `public/img/firme/${fileName}`;

    await sharp(imageBuffer)
      .toFormat('jpg')
      .toFile(filePath);

    const existingUser = await utenti.findOne({ cFiscale: cf });
    if (existingUser && existingUser.firma) {
      const imagePath = `public/img/firme/${existingUser.firma}`;
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await utenti.findOneAndUpdate({ cFiscale: cf }, { firma: fileName });

    res.redirect(req.get('referer'));
  });
});








router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/sendMessage', async (req, res) => {
  const {tel, content} = req.body;
  const phoneNumbers = tel.trim().split(', ');
  await sendMessage(phoneNumbers, content)
    .then(({ results, errorNumbers }) => {
        console.log('Numeri con errori:', errorNumbers);
        if(errorNumbers){
           return res.render('errorPage',{error: `errore nell\'invio dei messaggi ai numeri ${errorNumbers.join(', ')}`})
        }
        res.redirect('/admin');
    })
    .catch(error => {
        console.log('Si è verificato un errore:', error);
    });

});


router.post('/updateUser', async (req, res) =>{
    try {
        const userData= {
            nome: req.body.nome,
            cognome: req.body.cognome,
            nascita:{
                comune: req.body.comuneNascita,
                provincia: req.body.provinciaNascita,
                data: req.body.dataNascita,
            },
            sesso: req.body.sesso,
            residenza: {
                via: req.body.viaResidenza,
                nCivico: req.body.civicoResidenza,
                cap: req.body.capResidenza,
                comune: req.body.comuneResidenza,
                provincia: req.body.provinciaResidenza,
            },
            contatti: {
                email: req.body.email,
                tel: req.body.tel,
            },
            documento: req.body.documento,
            nDocumento: req.body.nDocumento,
            visita: (req.body.visita).split('-').reverse().join('/'),
            protocollo:{
              numero: req.body.nProtocollo,
              dataEmissione: (req.body.dataNProtocollo).split('-').reverse().join('/')
            },
            numeroPatente: req.body.nPatente,
            teoria: []
        };
        const emailSent = !!(await utenti.findOne({
          'cFiscale': req.body.cf,
          "teoria": {
              $elemMatch: { "emailSent": true }
          }
      }));    
        let respinto, idoneo, assente;
        for (let i = 0; i < req.body.teoriaLength && i < 2 + req.body.countTeoriaAssente; i++) {
          const esameData = req.body[`dataEsame${i}`];
          idoneo = req.body[`esitoEsame${i}`] === 'idoneo';
          respinto = req.body[`esitoEsame${i}`] === 'respinto';
          assente = req.body[`esitoEsame${i}`] === 'assente';
          userData.teoria.push({
              data: esameData ? esameData.split('-').reverse().join('/') : '',
              esito: idoneo ? true : respinto ? false : null,
              assente: assente,
              emailSent: emailSent ? true : false
          });
        }
        if(respinto && req.body.teoriaLength - 2 == req.body.countTeoriaAssente){
          userData.archiviato = true;
        }else if(respinto || assente){
          userData.teoria.push({
            data: null,
            esito: null
          });
        }else if(idoneo && !emailSent){
          try{
            const result = await sendEmail(req.body.email, 'Superamento Esame Teoria', `Complimenti ${req.body.nome} hai superato l'esame di teoria, vai sul sito agenda-autoscuolacentrale.com e registrati per poter iniziare a prenotare le lezioni di guida`);
            console.log(result);
            userData.teoria[req.body.teoriaLength-1] = {
              ...userData.teoria[req.body.teoriaLength-1],
              emailSent: true
            };
            userData.archiviato = true;
          }catch (error){
            console.error('Errore durante l\'invio dell\'email:', error);
          }
        }
        await utenti.findOneAndUpdate({"cFiscale": req.body.cf}, userData);
        res.redirect(`/userPage?cf=${req.body.cf}`);
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dei dati dell\'utente:', error);
        res.status(500).send({ error: 'Si è verificato un errore durante l\'aggiornamento dei dati dell\'utente' });
    }
});

router.post('/deleteUserImage', async (req, res) => {
  const { cf, intent } = req.body;
  const existingUser = await utenti.findOne({ cFiscale: cf });
  if(intent == 'firma' && existingUser){
    const imagePath = 'public/img/firme/' + existingUser.firma;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    await utenti.findOneAndUpdate({ "cFiscale": cf }, {$unset : {"firma" : ""}});
  }else if(intent == 'profilo' && existingUser){
    const imagePath = 'public/img/profileImages/' + existingUser.immagineProfilo;
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    await utenti.findOneAndUpdate({ "cFiscale": cf }, {$unset : {"immagineProfilo" : ""}});
  }
  res.redirect(`/userPage?cf=${cf}`);
});

router.get('/admin/price', async (req, res) => {
  const prezzo = await prezzi.findOne({});
  res.render('admin/pricePage', {price: prezzo.prezzo});
});
router.post('/updatePrice', async (req, res) => {
  const price = req.body.price;
  await prezzi.updateOne({"prezzo": price});
  console.log(`Il prezzo è stato aggiornato a ${price}€`)
  res.redirect('/admin/price');
});
router.get('/admin/fattureDaEmettere', async (req, res)=> {
  try{
    const cf = req.query.cf; 
    const dati = await utenti.findOne(
      {"cFiscale": cf},
      {"fatture": 1}
    );
    res.render('admin/fatture/fattureDaEmettere', {dati, cf});
  }catch(error){
    res.render('errorPage', {error: 'Utente non trovato'})
  }
});

router.get('/admin/emettiFattura', async (req, res)=> {
  try{
    const cf = req.query.cf; 
    const data = req.query.data.split('/').reverse().join('-'); 
    const importo = req.query.importo; 
    const nFattura = await numeroFattura.findOne();
    const datiUtente = await utenti.findOne(
      { "cFiscale": cf },
      { nome: 1, cognome: 1, cFiscale: 1, residenza: 1 }
    );
    res.render('admin/fatture/emettiFattura', {numeroFattura: nFattura.numero, dati: datiUtente, cf, data, importo});
  }catch(error){
    res.render('errorPage', {error: 'Utente non trovato'})
  }
});


router.post('/createFattura', async (req, res) =>{
  const dati = req.body;
  const data = (((dati.data).split('/')).reverse()).join('-'); 
  // Costruisci il documento XML della fattura elettronica
  const xml = create({ version: '1.0', encoding: 'UTF-8' })
  .ele('p:FatturaElettronica')
  .att('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#')
  .att('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2')
  .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
  .att('versione', 'FPR12')
  .att('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd')        .ele('FatturaElettronicaHeader')
          .ele('DatiTrasmissione')
              .ele('IdTrasmittente')
                  .ele('IdPaese').txt(dati.IdPaese).up()
                  .ele('IdCodice').txt(dati.IdCodice).up()
              .up()
              .ele('ProgressivoInvio').txt(dati.progressivoInvio).up()
              .ele('FormatoTrasmissione').txt(dati.formatoTrasmissione).up()
              .ele('CodiceDestinatario').txt(dati.codiceDestinatario).up()
              .ele('ContattiTrasmittente')
                  .ele('Telefono').txt(dati.telefonoTrasmittente).up()
                  .ele('Email').txt(dati.emailTrasmittente).up()
              .up()
          .up()
          .ele('CedentePrestatore')
              .ele('DatiAnagrafici')
                  .ele('IdFiscaleIVA')
                      .ele('IdPaese').txt(dati.IdPaese).up()
                      .ele('IdCodice').txt(dati.IdCodice).up()
                  .up()
                  .ele('CodiceFiscale').txt(dati.codiceFiscaleCedente).up()
                  .ele('Anagrafica')
                      .ele('Denominazione').txt(dati.denominazioneCedente).up()
                  .up()
                  .ele('RegimeFiscale').txt(dati.regimeFiscaleCedente).up()
              .up()
              .ele('Sede')
                  .ele('Indirizzo').txt(dati.indirizzoSedeCedente).up()
                  .ele('CAP').txt(dati.capSedeCedente).up()
                  .ele('Comune').txt(dati.comuneSedeCedente).up()
                  .ele('Provincia').txt(dati.provinciaSedeCedente).up()
                  .ele('Nazione').txt(dati.nazioneSedeCedente).up()
              .up()
          .up()
          .ele('CessionarioCommittente')
              .ele('DatiAnagrafici')
                  .ele('CodiceFiscale').txt(dati.codiceFiscaleCliente).up()
                  .ele('Anagrafica')
                      .ele('Nome').txt(dati.nomeCliente).up()
                      .ele('Cognome').txt(dati.cognomeCliente).up()
                  .up()
              .up()
              .ele('Sede')
                  .ele('Indirizzo').txt(dati.indirizzoSedeCliente).up()
                  .ele('CAP').txt(dati.capSedeCliente).up()
                  .ele('Comune').txt(dati.comuneSedeCliente).up()
                  .ele('Provincia').txt(dati.provinciaSedeCliente).up()
                  .ele('Nazione').txt(dati.nazioneSedeCliente).up()
              .up()
          .up()
      .up()
      .ele('FatturaElettronicaBody')
          .ele('DatiGenerali')
              .ele('DatiGeneraliDocumento')
                  .ele('TipoDocumento').txt(dati.tipoDocumento).up()
                  .ele('Divisa').txt(dati.divisa).up()
                  .ele('Data').txt(dati.data).up()
                  .ele('Numero').txt(dati.numeroDocumento).up()
                  .ele('ImportoTotaleDocumento').txt(dati.ImportoTotaleDocumento).up()
          .up()
      .up()
      .ele('DatiBeniServizi')
          .ele('DettaglioLinee')
              .ele('NumeroLinea').txt(dati.numeroLinea1).up()
              .ele('Descrizione').txt(dati.descrizione1).up()
              .ele('PrezzoUnitario').txt(dati.prezzoUnitario1).up()
              .ele('PrezzoTotale').txt(dati.prezzoTotale1).up()
              .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
              .ele('Natura').txt(dati.natura1).up()
          .up()
            .ele('DettaglioLinee')
            .ele('NumeroLinea').txt(dati.numeroLinea2).up()
            .ele('Descrizione').txt(dati.descrizione2).up()
            .ele('PrezzoUnitario').txt(dati.prezzoUnitario2).up()
            .ele('PrezzoTotale').txt(dati.prezzoTotale2).up()
            .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
          .up()
          .ele('DatiRiepilogo')
              .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo1).up()
              .ele('ImponibileImporto').txt(dati.imponibileImporto1).up()
              .ele('Imposta').txt(dati.imposta1).up()
              .ele('EsigibilitaIVA').txt(dati.esigibilitaIVA1).up()
          .up()
              .ele('DatiRiepilogo')
              .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo2).up()
              .ele('Natura').txt(dati.natura2).up()
              .ele('ImponibileImporto').txt(dati.imponibileImporto2).up()
              .ele('Imposta').txt(dati.imposta2).up()
              .ele('RiferimentoNormativo').txt(dati.RiferimentoNormativo2).up()
          .up()
      .up()
      .ele('DatiPagamento')
          .ele('CondizioniPagamento').txt(dati.condizioniPagamento).up()
          .ele('DettaglioPagamento')
              .ele('ModalitaPagamento').txt(dati.modalitaPagamento).up()
              .ele('ImportoPagamento').txt(dati.importoPagamento)
          .up()
      .up()
  .up();

  const xmlString = xml.end({ prettyPrint: true });
  const nomeBaseFile = `${dati.IdPaese}${dati.IdCodice}_${dati.progressivoInvio}.xml`;
  let nomeFile = nomeBaseFile;

  let counter = 1;

  while (fs.existsSync(path.join('fatture/elettroniche', nomeFile))) {
      nomeFile = `${nomeBaseFile}_${counter}.xml`;
      counter++;
  }
  fs.writeFile(path.join('fatture/elettroniche', nomeFile), xmlString, async (err) => {
    if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
    } else {
      // await utenti.findONeAndUpdate(
      //   {
      //     "cFiscale": dati.codiceFiscaleCliente,
      //     "fatture": {
      //       $elemMatch: {
      //           "data": dati.data.split('-').reverse().join('/'),
      //           "importo": dati.importoPagamento,
      //           "emessa": false
      //       }
      //     }
      //   },
      //   {
      //     $set: {
      //       "fatture.$.emessa": true
      //     }
      // });

      const doc = new PDFDocument();


        doc.fontSize(16).text('Autoscuola Centrale', { align: 'left' });
        doc.text('Corso Marconi 33 - 10125 Torino (TO)', { align: 'left' });
        doc.text('P.IVA 06498290011', { align: 'left' });
        doc.text('Fattura di Cortesia', { align: 'right' });
        doc.moveDown();
      
        doc.moveDown();
        doc.rect(50, doc.y, 500, 1).fill('#000');
        doc.moveDown();

        doc.text('CLIENTE', { underline: true });
        doc.rect(50, doc.y + 10, 500, 200).stroke();
        doc.moveDown();
        doc.text(`Nome: ${dati.nomeCliente} ${dati.cognomeCliente}`, 60, doc.y + 20);
        doc.text(`Numero: ${dati.progressivoInvio}`, 60, doc.y + 20);
        doc.text(`Indirizzo: ${dati.indirizzoSedeCliente} ${dati.capSedeCliente} ${dati.comuneSedeCliente} (${dati.provinciaSedeCliente})`,  60, doc.y + 20);
        doc.text(`Data: ${dati.data}`, 60, doc.y + 20);
        doc.text(`C.Fiscale: ${dati.codiceFiscaleCliente}`, 60, doc.y + 20);
        doc.moveDown();
      
        // Box per dettagli della fattura
        doc.text('Dettagli Fattura', { underline: true });
        doc.moveDown();
        doc.text('Data             Descrizione                            QTA     EURO');
        doc.text(`${data}     ${dati.descrizione1}                           ${dati.imponibileImporto1}€`);
        doc.moveDown();
        doc.fillColor("#FF0000").text(`Fattura di cortesia  non valida ai fini fiscali.`);
        doc.text(`La fattura è stata emessa in formato elettronico ed è consultabile nel cassetto fiscale`);
        doc.fillColor("#000000");
        doc.moveDown();
        doc.text('Modalità di pagamento', { underline: true });
        doc.moveDown();
        doc.text('TOTALE IMPONIBILE: ', { continued: true });
        doc.text(`${dati.imponibileImporto1} €`);
        doc.text('IVA 22%: ', { continued: true });
        doc.text(`${(Number(dati.imponibileImporto1) * 0.22).toFixed(2)} €`);
        doc.text('TOTALE FATTURA: ', { continued: true });
        doc.text(`${dati.ImportoTotaleDocumento} €`);
        doc.moveDown();
      
        doc.pipe(fs.createWriteStream(`./fatture/cortesia/fattura_${dati.nomeCliente}_${dati.cognomeCliente}.pdf`));
        doc.end();

        const email = await utenti.findOne({"cFiscale": dati.codiceFiscaleCliente}, {"contatti.email": 1});
        const subject = 'Fattura di cortesia';
        const text = `Gentile ${dati.cognomeCliente} ${dati.nomeCliente} ti inviamo la fattura di cortesia per il pagamento che hai effettuato.`;
        const filename = `./fatture/cortesia/fattura_${dati.nomeCliente}_${dati.cognomeCliente}.pdf`;
        try{
          const result = await sendEmail(email.contatti.email, subject, text, filename);
          console.log(result);
        }catch(error){
          console.log('errore: ', error);
        }
    }
    });
});


module.exports = router;