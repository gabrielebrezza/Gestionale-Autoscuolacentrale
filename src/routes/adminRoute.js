const express = require('express');
const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const cookieParser = require('cookie-parser');
const router = express.Router();

//databases
const utenti = require('../DB/User');
const prezzi = require('../DB/Prezzi');
const codes = require('../DB/Codes');
const cassa = require('../DB/Cassa');
const ClientiGenerici = require('../DB/ClientiGenerici');
const numeroFattura = require('../DB/NumeroFattura');
const storicoFattureGenerali = require('../DB/StoricoFattureGenerali');
const storicoFattureAgenda = require('../DB/storicoFattureAgenda');
const rinnovi = require('../DB/Rinnovi');
const Duplicati = require('../DB/Duplicati');
//functions
const sendEmail = require('../utils/emailsUtils.js');
const {creaFatturaElettronica, creaFatturaCortesia, scaricaFatturaAPI} = require('../utils/fattureUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const {compilaTt2112, compilaCertResidenza, compilaVmRinnovo} = require('../utils/compileUtils');

router.use(cookieParser());




router.get('/admin', authenticateJWT, async (req, res) =>{
    const users = await utenti.find({});
    res.render('admin/usersPage', {users})
});
router.get('/userPage', authenticateJWT, async (req, res) =>{
    const user = await utenti.findOne({"cFiscale": req.query.cf});
    if(!user){
        return res.render('errorPage',{error: 'utente non trovato'});
    }
    res.render('admin/userPage',{user});
});
const storage = multer.memoryStorage();

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
    const filePath = path.resolve(__dirname, '../../privateImages', 'firme', fileName);

    await sharp(imageBuffer)
      .toFormat('jpg')
      .toFile(filePath);

    const existingUser = await utenti.findOne({ cFiscale: cf });
    if (existingUser && existingUser.firma) {
      const imagePath = path.resolve(__dirname, '../../privateImages', 'firme', existingUser.firma);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await utenti.findOneAndUpdate({ cFiscale: cf }, { firma: fileName });

    res.redirect(req.get('referer'));
  });
});

router.get('/admin/pagamenti', async (req, res) => {
    const pagamenti = await utenti.findOne({"cFiscale": req.query.cf}, {"fatture": 1}); 
    if(pagamenti.fatture == '') return res.render('errorPage', {error: "Questo utente non ha effetuato ancora un pagamento"});
    res.render('admin/payments/storicoPagamenti',{pagamenti: pagamenti.fatture})
});


router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/updateUser', authenticateJWT, async (req, res) =>{
      try {
        const dati = req.body;
        const utenteDatabase = await utenti.findOne({'cFiscale': dati.cf})
        const userData= {
            nome: dati.nome,
            cognome: dati.cognome,
            nascita:{
                comune: dati.comuneNascita,
                provincia: dati.provinciaNascita,
                data: dati.dataNascita,
            },
            sesso: dati.sesso,
            residenza: {
                via: dati.viaResidenza,
                nCivico: dati.civicoResidenza,
                cap: dati.capResidenza,
                comune: dati.comuneResidenza,
                provincia: dati.provinciaResidenza,
            },
            contatti: {
                email: dati.email,
                tel: dati.tel,
            },
            documento: dati.documento,
            nDocumento: dati.nDocumento,
            patente: utenteDatabase.patente,
            visita: (dati.visita).split('-').reverse().join('/'),
            protocollo:{
              numero: dati.nProtocollo,
              dataEmissione: (dati.dataNProtocollo).split('-').reverse().join('/')
            },
            numeroPatente: dati.nPatente,
            teoria: [],
            note: dati.note
        };
        const emailSent = !!(await utenti.findOne({
          'cFiscale': dati.cf,
          "teoria": {
              $elemMatch: { "emailSent": true }
          }
      }));    
        let respinto, idoneo, assente;

        for (let i = 0; i < dati.teoriaLength && i < 2 + dati.countTeoriaAssente; i++) {
          const esameData = dati[`dataEsame${i}`];
          idoneo = dati[`esitoEsame${i}`] === 'idoneo';
          respinto = dati[`esitoEsame${i}`] === 'respinto';
          assente = dati[`esitoEsame${i}`] === 'assente';
          userData.teoria.push({
              data: esameData ? esameData.split('-').reverse().join('/') : '',
              esito: idoneo ? true : respinto ? false : null,
              assente: assente,
              emailSent: emailSent ? true : false
          });
        }
        if(respinto && dati.teoriaLength - 2 == dati.countTeoriaAssente){
          
          userData.patente.forEach((patente, index) => {
            if (patente.bocciato === null && patente.tipo == dati.patente) {
              userData.patente[index].bocciato = true;
            }
          });
          userData.archiviato = true;
        }else if(respinto || assente){
          userData.teoria.push({
            data: null,
            esito: null
          });
        }else if(idoneo && !emailSent){
          try{
            const result = await sendEmail(dati.email, 'Superamento Esame Teoria', `Complimenti ${dati.nome} hai superato l'esame di teoria, vai sul sito agenda-autoscuolacentrale.com e registrati per poter iniziare a prenotare le lezioni di guida`);
            console.log(result);
            userData.teoria[dati.teoriaLength-1] = {
              ...userData.teoria[dati.teoriaLength-1],
              emailSent: true
            };
            userData.patente.forEach((patente, index) => {
              if (patente.bocciato === null && patente.tipo == dati.patente) {
                userData.patente[index].bocciato = false;
              }
            });
            userData.archiviato = true;
          }catch (error){
            console.error('Errore durante l\'invio dell\'email:', error);
          }
        }
        
        await utenti.findOneAndUpdate({"cFiscale": dati.cf}, userData);
        res.redirect(`/userPage?cf=${dati.cf}`);
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dei dati dell\'utente:', error);
        res.status(500).send({ error: 'Si è verificato un errore durante l\'aggiornamento dei dati dell\'utente' });
    }
});

router.get('/images', authenticateJWT, async (req, res) => {
  const imageName = req.query.dir; 
  const imagePath = path.resolve(__dirname, '../../privateImages', imageName);
  try {
    await fsp.access(imagePath);
    res.sendFile(imagePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Immagine non trovata.');
    } else {
      console.log('errore server')
      res.status(500).send('Errore del server.');
    }
  }
});

router.post('/deleteUsers', authenticateJWT, async (req, res) => {
  const users = req.body;
  for (const id of Object.values(users)) {
      await utenti.deleteOne({"_id": id});
      console.log(`utente ${id} eliminato definitivamente`);
  }
  res.redirect('/admin');
});


router.get('/admin/price', authenticateJWT, async (req, res) => {
  const prices = await prezzi.find();
  res.render('admin/payments/pricePage', {prices});
});
router.post('/updatePrice', authenticateJWT, async (req, res) => {
  const {tipo, iscrizione, price} = req.body;
  if(iscrizione == 1){
    await prezzi.findOneAndUpdate({"tipo": tipo}, {"prezzoPrimaIscrizione": price});
  }else{
    await prezzi.findOneAndUpdate({"tipo": tipo}, {"prezzoIscrizioniSuccessive": price});
  }
  
  console.log(`Il prezzo della ${iscrizione} iscrizione della patente ${tipo} è stato aggiornato a ${price}€`)
  res.redirect('/admin/price');
});

router.post('/createCode', async (req, res) => {
  try {
    const {email, cf, patente, iscrizione} = req.body;
    let importo;
    if (iscrizione == 1) {
      const result = await prezzi.findOne({ tipo: patente }, { prezzoPrimaIscrizione: 1 });
      importo = result.prezzoPrimaIscrizione;
    } else {
      const result = await prezzi.findOne({ tipo: patente }, { prezzoIscrizioniSuccessive: 1 });
      importo = result.prezzoIscrizioniSuccessive;
    }
    
    const length = 15;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    await codes.create({"cFiscale": cf.toLowerCase().trim(), "code": code, "email": email.toLowerCase().trim(), "importo": importo});
    
    const subject = `Codice per pagamento AutoscuolaCentrale`;
    const text = `${code} Questo è il codice che dovrai usare per iscriverti alla patente ${patente}. Per iscriverti visita il sito iscrizione-autoscuolacentrale.com`;
    try{
      const result = await sendEmail(email, subject, text);
      console.log(result);
    }catch(error){
      console.log('errore: ', error);
    }
    res.json({success: true, code: code, importo: importo});
  } catch (error) {
    console.log(error);
    res.json({success: false, message: "errore nella generazione del codice"});
  }

});

router.post('/stampa', authenticateJWT, async (req, res)=> {
  const { id, modulo } = req.body;
  
  const filePath = path.resolve(__dirname, '../../certificati', `${modulo}` , `${modulo}_${id}.pdf`);
  try {
      await fsp.access(filePath);
      res.setHeader('Content-Type', 'application/pdf');

      res.sendFile(filePath, { 
        headers: {
          'Content-Disposition': `inline; filename=${modulo}_${id}.pdf`
        }
      });
  } catch (err) {
    try {
      switch(modulo){
        case 'residenza' : {
          await compilaCertResidenza(id);
          break;
        }
        case 'tt2112' : {
          await compilaTt2112(id);
          break;
        }
        case 'vmRinnovo' : {
            await compilaVmRinnovo(id);
          break;
        }
        default: {
          return res.render('errorPage', {error: `si è verificato un'errore`});
          break;
        }
      }
    } catch (err) {
      console.error(`errore nella compilazione del modulo ${modulo}, errore: ${err}`)
      return res.render('errorPage', {error: `si è verificato un errore nella compilazione del modulo. errore: ${err}`});
    }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath, { 
        headers: {
          'Content-Disposition': `inline; filename=${modulo}_${id}.pdf`
        }
      });
  }
});

router.get('/admin/fattureDaEmettere', authenticateJWT, async (req, res)=> {
  try{
    const cf = req.query.cf; 
    const dati = await utenti.findOne(
      {"cFiscale": cf},
      {"fatture": 1}
    );
    res.render('admin/payments/fatture/fattureDaEmettere', {dati, cf});
  }catch(error){
    res.render('errorPage', {error: 'Utente non trovato'})
  }
});

router.get('/admin/emettiFattura', authenticateJWT, async (req, res)=> {
  try{
    const nFattura = await numeroFattura.findOne();
    if( req.query.cf && req.query.data && req.query.importo){
      const cf = req.query.cf;
      const data = req.query.data.split('/').reverse().join('-'); 
      const importo = req.query.importo; 
      const dati = await utenti.findOne(
        { "cFiscale": cf },
        { nome: 1, cognome: 1, cFiscale: 1, residenza: 1 }
      );
      return res.render('admin/payments/fatture/emettiFattura', {numeroFattura: nFattura.numero, dati, cf, data, importo, iscrizione: true, rinnovo : false});
    }else if(req.query.id){
      const id = req.query.id;
      const dati = await utenti.findOne(
        { "_id": id },
        { nome: 1, cognome: 1, cf: 1, spedizione: 1, fatture: 1}
      );
      return res.render('admin/payments/fatture/emettiFattura', {numeroFattura: nFattura.numero, dati, iscrizione: false, rinnovo : true});
    }
    const clienti = await ClientiGenerici.find();
    res.render('admin/payments/fatture/emettiFattura', {numeroFattura: nFattura.numero, clienti, iscrizione: false, rinnovo : false});
  }catch(error){
      res.render('errorPage', {error: 'Utente non trovato'})
  }
});


router.post('/createFattura', authenticateJWT, async (req, res) =>{
  let dati, duplicato, id;
  if(req.body.id){
    id = req.body.id.replace(/"/g, '');
    let user = await rinnovi.findOne({"_id": id});
    if(!user){
      user = await Duplicati.findOne({"_id": id});
      duplicato = true;
    }
    const today = new Date();
    const DD = String(today.getDate()).padStart(2, '0'); 
    const MM = String(today.getMonth() + 1).padStart(2, '0'); 
    const YYYY = today.getFullYear(); 
    const data = `${YYYY}-${MM}-${DD}`;
    const importo = Number(req.body.importo.replace(/"/g, ''));
    dati = {
      codiceDestinatario: '0000000',
      nomeCliente: user.nome,
      cognomeCliente: user.cognome,
      codiceFiscaleCliente: user.cf,
      emailCliente: user.contatti.email,
      indirizzoSedeCliente: !duplicato ? `${user.spedizione.via} ${user.spedizione.nCivico}`: `${user.residenza.via} ${user.residenza.nCivico}`,
      capSedeCliente: !duplicato ? user.spedizione.cap : user.residenza.cap,
      comuneSedeCliente: !duplicato ? user.spedizione.comune : user.residenza.comune,
      provinciaSedeCliente: !duplicato ? user.spedizione.provincia : user.residenza.provincia,
      nazioneSedeCliente: 'IT',
      data: data,
      ImportoTotaleDocumento: Number(importo).toFixed(2),
      descrizione1: !duplicato ? 'Rinnovo patente' : 'Duplicato Patente',
      prezzoUnitario1: ((importo-27.80)/1.22).toFixed(2),
      prezzoTotale1: ((importo-27.80)/1.22).toFixed(2),
      aliquotaIVA1: '0.00',
      descrizione2: 'anticipazioni conto cliente iva esclusa art.15 dpr 633/72',
      prezzoUnitario2: '27.80',
      prezzoTotale2: '27.80',
      aliquotaIVA2: '22.00',
      aliquotaIVARiepilogo1: '22.00',
      imponibileImporto1: ((importo-27.80)/1.22).toFixed(2),
      imposta1: (((((importo-27.80)/1.22))*22)/100).toFixed(2),
      esigibilitaIVA1: 'I',
      aliquotaIVARiepilogo2: '0.00',
      imponibileImporto2: '27.80',
      imposta2: '0.00',
      RiferimentoNormativo2: 'Anticipazioni conto cliente art. 15 DPR 633/72',
      condizioniPagamento: 'TP02',
      modalitaPagamento: 'MP05',
      importoPagamento: Number(importo).toFixed(2)
    }
  }else{
    dati = req.body;
  }
  const rinnovo = req.body.id ? (!duplicato ? true : false) : false;
  const iscrizione = req.body.iscrizione == 'true';
  if(iscrizione){
    const {numeroIscrizioni} = await numeroFattura.findOne();
    dati.progressivoInvio = `i00${numeroIscrizioni}`;
    dati.numeroDocumento = `i00${numeroIscrizioni}`;
  }else if(rinnovo){
    const {numeroRinnovi} = await numeroFattura.findOne();
    dati.progressivoInvio = `r00${numeroRinnovi}`;
    dati.numeroDocumento = `r00${numeroRinnovi}`;
  }else if(duplicato){
    const {numeroDuplicati} = await numeroFattura.findOne();
    dati.progressivoInvio = `d00${numeroDuplicati}`;
    dati.numeroDocumento = `d00${numeroDuplicati}`;
  }else{
    const {numeroGeneriche} = await numeroFattura.findOne();
    dati.progressivoInvio = `m00${numeroGeneriche}`;
    dati.numeroDocumento = `m00${numeroGeneriche}`;
  }

  try {
    const result = await creaFatturaElettronica(dati, iscrizione, rinnovo, duplicato);
    console.log(result);
  } catch (error) {
    console.error('Errore nell\'emissione della fattura elettronica: ', error);
    return res.render('errorPage', { error: 'errore nell\'emissione della fattura elettronica' });
  }
  try {
    const result = await creaFatturaCortesia(dati, iscrizione);
    console.log(result);
  } catch (error) {
    console.error(error);
    return res.render('errorPage', { error: 'errore nell\'emissione della fattura di cortesia' });
  }
  
  if(iscrizione){
    await utenti.findOneAndUpdate(
      {
        "cFiscale": dati.codiceFiscaleCliente,
        "fatture": {
          $elemMatch: {
              "data": dati.data.split('-').reverse().join('/'),
              "importo": dati.importoPagamento,
              "emessa": false
          }
        }
      },
      {
        $set: {
          "fatture.$.emessa": true
        }
    });
  }else if(rinnovo){
    await rinnovi.findOneAndUpdate({"_id": id}, {"fatture": {"data": dati.data, "importo": dati.importoPagamento, "emessa": true, "numero": Number(dati.progressivoInvio.replace('r00', ''))}});
  }else if(duplicato){
    await Duplicati.findOneAndUpdate({"_id": id}, {"fatture": {"data": dati.data, "importo": dati.importoPagamento, "emessa": true}});
  }
  if(iscrizione){
    await numeroFattura.updateOne({$inc: {"numeroIscrizioni": 1}});
  }else if(rinnovo){
    await numeroFattura.updateOne({$inc: {"numeroRinnovi": 1}});
  }else if(duplicato){
    await numeroFattura.updateOne({$inc: {"numeroDuplicati": 1}});
  }else{
    await numeroFattura.updateOne({$inc: {"numeroGeneriche": 1}});
  }
  const today = new Date();
  const DD = String(today.getDate()).padStart(2, '0'); 
  const MM = String(today.getMonth() + 1).padStart(2, '0'); 
  const YYYY = today.getFullYear(); 
  const dataFatturazione = `${DD}/${MM}/${YYYY}`;
  try{
    const nuovaFattura = new storicoFattureGenerali({
      tipo: iscrizione ? 'iscrizione' : (rinnovo ? 'rinnovo' : (duplicato ? 'duplicato' : 'generica')),
      numero: parseInt(dati.progressivoInvio.replace(/\D/g, ''), 10),
      importo: dati.importoPagamento,
      user: `${dati.nomeCliente} ${dati.cognomeCliente}`,
      data: dataFatturazione,
      nomeFile: `IT06498290011_${dati.progressivoInvio}.xml`,
    });
    await  nuovaFattura.save()                
  }catch(error){
    console.error('Si è verificato un errore durante l\'aggiunta della fattura allo storico:', error);
    return res.render('errorPage', {error: 'errore nell\'aggiunta della fattura allo storico'});
  }

  let email
  if(iscrizione){
    const utente = await utenti.findOne({"cFiscale": dati.codiceFiscaleCliente}, {"contatti.email": 1});
    email = utente.contatti.email
  }else{
    email = dati.emailCliente;
  }
  const subject = 'Fattura di cortesia';
  const text = `Gentile ${dati.cognomeCliente} ${dati.nomeCliente} ti inviamo la fattura di cortesia per il pagamento che hai effettuato.`;
  const filename = `./fatture/cortesia/fattura_${dati.nomeCliente}_${dati.cognomeCliente}.pdf`;
  try{
    const result = await sendEmail(email, subject, text, filename);
    console.log(result);
  }catch(error){
    console.log('errore: ', error);
  }

  if(!iscrizione && !rinnovo && !duplicato){
    if(req.body.saveCustomerData == 'save'){
      try{
        const nuovoCliente = new ClientiGenerici({
          cDestinatario: dati.codiceDestinatario.trim(),
          nome: dati.nomeCliente.trim(),
          cognome: dati.cognomeCliente.trim(),
          cFiscale: dati.codiceFiscaleCliente.trim(),
          email: dati.emailCliente.trim(),
          pIva: dati.partitaIvaCliente,
          idPaese: dati.IdPaeseCliente,
          residenza : {
            indirizzo: dati.indirizzoSedeCliente.trim(),
            cap: dati.capSedeCliente.trim(),
            comune: dati.comuneSedeCliente.trim(),
            provincia: dati.provinciaSedeCliente.trim(),
            nazione: dati.nazioneSedeCliente.trim(),
          }
        });
        await  nuovoCliente.save()                
      }catch(error){
        console.error('Si è verificato un errore durante l\'aggiunta del nuovo utente:', error);
        return res.render('errorPage', {error: 'errore nell\'aggiunta del nuovo utente'});
      }
    }
  }
  if(rinnovo){
    return res.redirect(`/admin/rinnovi`);
  }
  if(duplicato){
    return res.redirect(`/admin/duplicati`);
  }
  res.redirect(`/admin`);
});

router.get('/admin/storicoFatture', authenticateJWT, async (req, res)=> {
  try {
    const fattureGenerali = await storicoFattureGenerali.find();
    const fattureAgenda = await storicoFattureAgenda.find();
    let fatture = [...fattureGenerali, ...fattureAgenda];
    res.render('admin/payments/fatture/storicoFatture', { fatture });
  } catch (error) {
    console.error('Si è verificato un errore durante il recupero delle fatture:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il recupero delle fatture'});
  }
});



router.post('/admin/editFatturaStatus', authenticateJWT, async (req, res) => {
  try {
    const { paid, id } = req.body;
    await storicoFattureGenerali.findOneAndUpdate({ "_id": id }, { "paid": paid });
    return res.status(200);
  } catch (error) {
    console.error('Si è verificato un\'errore: ', error)
    return res.render('errorPage', { error: 'Si è verificato un\'errore nel cambiamento di stato'});
  }

});



router.post('/downloadFatture', authenticateJWT, async (req, res) => {
  try {
    let fattureArr = (Object.keys(req.body)
    .filter(key => key.startsWith('IT06498290011')))
    .map(key => req.body[key]);
    if(fattureArr == ''){
      const fromDate = new Date(req.body.fromDate);
      const toDate = new Date(req.body.toDate);
      const fattureGenerali = await storicoFattureGenerali.find();
      for(const fattura of fattureGenerali){
        const dataFattura = new Date(fattura.data.split('/').reverse().join('-'));
        if(fromDate <= dataFattura && dataFattura <= toDate){
          fattureArr.push(fattura.nomeFile);
          continue;
        }
        if( !req.body.fromDate || !req.body.toDate ){
          fattureArr.push(fattura.nomeFile);
        }
      }
      const fattureAgenda = await storicoFattureAgenda.find();
      for(const fattura of fattureAgenda){
        const dataFattura = new Date(fattura.data.split('/').reverse().join('-'));
        if(fromDate <= dataFattura && dataFattura <= toDate){
          fattureArr.push(fattura.nomeFile);
          const filePath = path.join(__dirname, '../../fatture/elettroniche', fattura.nomeFile);
          try {
            fs.accessSync(filePath, fs.constants.F_OK);
          } catch (err) {
            if (err.code === 'ENOENT') {
              await scaricaFatturaAPI(fattura.numero);
            } else {
              console.error(`Errore durante il controllo del file ${fattura.nomeFile}: `, err);
            }
          }
          continue;
        }
        if( !req.body.fromDate || !req.body.toDate ){
          fattureArr.push(fattura.nomeFile);
        }
      }
      if(fattureArr == '' ){
        return res.render('errorPage', {error: `Nessuna fattura emessa nell'intervallo di tempo selezionato `});
      }
    }else{
      for(const fattura of fattureArr){
          const filePath = path.join(__dirname, '../../fatture/elettroniche', fattura);
          try {
            fs.accessSync(filePath, fs.constants.F_OK);
          } catch (err) {
            if (err.code === 'ENOENT') {
              const numeroFattura = fattura.replace('.xml', '').replace('IT06498290011_', '');
              if(numeroFattura.startsWith('g')){
                await scaricaFatturaAPI(numeroFattura.replace('g00', ''));
              }
            } else {
              console.error(`Errore durante il controllo del file ${fattura}: `, err);
            }
          }
      }
    }
    const tipo = req.body.tipo;
    if(tipo != 'all'){
      if(tipo == 'g'){
        fattureArr = fattureArr.filter(fattura => fattura.replace('IT06498290011_', '').startsWith('g'));
      }
      if(tipo == 'r'){
        fattureArr = fattureArr.filter(fattura => fattura.replace('IT06498290011_', '').startsWith('r'));
      }
      if(tipo == 'i'){
        fattureArr = fattureArr.filter(fattura => fattura.replace('IT06498290011_', '').startsWith('i'));
      }
      if(tipo == 'm'){
        fattureArr = fattureArr.filter(fattura => fattura.replace('IT06498290011_', '').startsWith('m'));
      }
      if(tipo == 'd'){
        fattureArr = fattureArr.filter(fattura => fattura.replace('IT06498290011_', '').startsWith('d'));
      }
    }

    if (fattureArr.length === 1) {
      const nomeFile = fattureArr[0];
      const filePath = path.join(__dirname, '../../fatture', 'elettroniche', nomeFile);
      if (fs.existsSync(filePath)) {
        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="${nomeFile}"`);
        res.sendFile(filePath);
      } else {
        console.warn(`Il file ${nomeFile} non esiste nella cartella fatture.`);
        res.status(404).send('File non trovato.');
      }
    } else if (fattureArr.length > 1) {
      res.set('Content-Type', 'application/zip');
      res.set('Content-Disposition', 'attachment; filename="fatture_gestionale.zip"');

      const zip = archiver('zip');
      zip.pipe(res);

      for (const nomeFile of fattureArr) {
        const filePath = path.join(__dirname, '../../fatture', 'elettroniche', nomeFile);
        if (fs.existsSync(filePath)) {
          zip.append(fs.createReadStream(filePath), { name: nomeFile });
        } else {
          console.warn(`Il file ${nomeFile} non esiste nella cartella fatture.`);
        }
      }

      await zip.finalize();
    } else {
      res.status(400).send('Nessun file da inviare.');
    }
  } catch (error) {
    console.error('Si è verificato un errore durante il download delle fatture:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il download delle fatture'});
  }
})

router.get('/admin/cassa', authenticateJWT, async (req, res) => {
    const datiCassa = await cassa.find();

    res.render('admin/payments/cassa', {cassa : datiCassa})
});

router.post('/updateCassa', authenticateJWT, async (req, res) => {
  const causa = req.body.causa.trim();
  const data = req.body.data.split('-').reverse().join('/');
  const tipo = req.body.tipoSpesa;
  let importo = parseFloat(req.body.importo);
  if(tipo == 'uscita'){
    importo = -importo
  }
  const updateCassa = new cassa({causa: causa, data: data, importo: importo});
  await updateCassa.save()    

  res.redirect('admin/cassa');
});
router.post('/deleteCassaItem', authenticateJWT, async (req, res) => {
  const transazioni = req.body;
  for (const id of Object.values(transazioni)) {
      await cassa.deleteOne({"_id": id});
      console.log(`transazione ${id} eliminata definitivamente`);
  }
  res.redirect('/admin/cassa');
});

module.exports = router;
