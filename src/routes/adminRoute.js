const express = require('express');
const bodyParser = require('body-parser');
const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const cookieParser = require('cookie-parser');
const router = express.Router();

//databases
const admins = require('../DB/Admin');
const utenti = require('../DB/User');
const prezzi = require('../DB/Prezzi');
const codes = require('../DB/Codes');
const numeroFattura = require('../DB/NumeroFattura');
const storicoFatture = require('../DB/StoricoFatture');
//functions
const sendEmail = require('../utils/emailsUtils.js');
const {creaFatturaElettronica, creaFatturaCortesia} = require('../utils/fattureUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const {compilaTt2112, compilaCertResidenza} = require('../utils/compileUtils');

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
    const filePath = path.resolve(__dirname, '../../privateImages', 'profileImages' , fileName);

    fs.writeFile(filePath, webpBuffer, async (err) => {
      if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
      }

      const existingUser = await utenti.findOne({ cFiscale: cf });
      if (existingUser && existingUser.immagineProfilo) {
        const imagePath = path.resolve(__dirname, '../../privateImages', 'profileImages' , existingUser.immagineProfilo);
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
              console.log(patente)
              console.log(dati.patente)
              if (patente.bocciato === null && patente.tipo == dati.patente) {
                userData.patente[index].bocciato = false;
                console.log('fatto')
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

router.post('/deleteUserImage', authenticateJWT, async (req, res) => {
  const { cf, intent } = req.body;
  const existingUser = await utenti.findOne({ cFiscale: cf });
  if(intent == 'firma' && existingUser){
    const imagePath = path.resolve(__dirname, '../../privateImages', 'firme', existingUser.firma);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    await utenti.findOneAndUpdate({ "cFiscale": cf }, {$unset : {"firma" : ""}});
  }else if(intent == 'profilo' && existingUser){
    const imagePath = path.resolve(__dirname, '../../privateImages', 'profileImages', existingUser.immagineProfilo);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    await utenti.findOneAndUpdate({ "cFiscale": cf }, {$unset : {"immagineProfilo" : ""}});
  }
  res.redirect(`/userPage?cf=${cf}`);
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
  for (const cf of Object.values(users)) {
      await utenti.deleteOne({"cFiscale": cf});
      console.log(`utente ${cf} eliminato definitivamente`);
  }
  res.redirect('/admin');
});


router.get('/admin/price', authenticateJWT, async (req, res) => {
  const prices = await prezzi.find();
  res.render('admin/pricePage', {prices});
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
    await codes.create({"cFiscale": cf.toLowerCase(), "code": code, "email": email.toLowerCase(), "importo": importo});
    
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

router.post('/stampa', async (req, res)=> {
  const { cf, modulo } = req.body;
  
  const filePath = path.resolve(__dirname, '../../certificati', `${modulo}` , `${modulo}_${cf}.pdf`);
  try {
      await fsp.access(filePath);
      res.setHeader('Content-Type', 'application/pdf');

      res.sendFile(filePath, { 
        headers: {
          'Content-Disposition': `inline; filename=${modulo}_${cf}.pdf`
        }
      });
  } catch (err) {
      if(modulo == 'residenza'){
        await compilaCertResidenza(cf);
      }else{
        await compilaTt2112(cf);
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath, { 
        headers: {
          'Content-Disposition': `inline; filename=${modulo}_${cf}.pdf`
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
    res.render('admin/fatture/fattureDaEmettere', {dati, cf});
  }catch(error){
    res.render('errorPage', {error: 'Utente non trovato'})
  }
});

router.get('/admin/emettiFattura', authenticateJWT, async (req, res)=> {
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


router.post('/createFattura', authenticateJWT, async (req, res) =>{
  let dati = req.body;
  const {numero} = await numeroFattura.findOne();
  dati.progressivoInvio = `i00${numero}`;
  dati.numeroDocumento = `i00${numero}`;
  
  try {
    const result = await creaFatturaElettronica(dati);
    console.log(result);
  } catch (error) {
    console.error('Errore nell\'emissione della fattura elettronica: ', error);
    return res.render('errorPage', { error: 'errore nell\'emissione della fattura elettronica' });
  }
  try {
    const result = await creaFatturaCortesia(dati);
    console.log(result);
  } catch (error) {
    console.error(error);
    return res.render('errorPage', { error: 'errore nell\'emissione della fattura di cortesia' });
  }

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
  await numeroFattura.updateOne({$inc: {"numero": 1}});
  const today = new Date();
  const DD = String(today.getDate()).padStart(2, '0'); 
  const MM = String(today.getMonth() + 1).padStart(2, '0'); 
  const YYYY = today.getFullYear(); 
  const dataFatturazione = `${DD}/${MM}/${YYYY}`;
  try{
    const nuovaFattura = new storicoFatture({
      numero: parseInt(dati.progressivoInvio.replace(/\D/g, ''), 10),
      importo: dati.importoPagamento,
      data: dataFatturazione,
      nomeFile: `${dati.IdPaese}${dati.IdCodice}_${dati.progressivoInvio}.xml`,
    });
    await  nuovaFattura.save()                
  }catch(error){
    console.error('Si è verificato un errore durante l\'aggiunta della fattura allo storico:', error);
    return res.render('errorPage', {error: 'errore nell\'aggiunta della fattura allo storico'});
  }
  
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
  res.redirect(`/admin`);
});

router.get('/admin/storicoFatture', authenticateJWT, async (req, res)=> {
  try {
    const fatture = await storicoFatture.find();
    res.render('admin/fatture/storicoFatture', { fatture });
  } catch (error) {
    console.error('Si è verificato un errore durante il recupero delle fatture:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il recupero delle fatture'});
  }
});
router.post('/downloadFatture', authenticateJWT, async (req, res) => {
  try {
    const fromDate = new Date(req.body.fromDate);
    const toDate = new Date(req.body.toDate);
    const fatture = await storicoFatture.find();
    let fattureArr = [];
    for(const fattura of fatture){
      const dataFattura = new Date(fattura.data.split('/').reverse().join('-'));
      if(fromDate <= dataFattura && dataFattura <= toDate){
        fattureArr.push(fattura.nomeFile);
        continue;
      }
      if( !req.body.fromDate || !req.body.toDate ){
        fattureArr.push(fattura.nomeFile);
      }
    }


        // Imposta il nome del file ZIP e la disposizione della risposta HTTP
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename="fatture_filtrate.zip"');

        //creazione archivio zip
        const zip = archiver('zip');

        // Reindirizzazione dell'output dell'archivio verso la risposta HTTP
        zip.pipe(res);

        for (const nomeFile of fattureArr) {
            const filePath = path.join(__dirname, '../../fatture', 'elettroniche' , nomeFile);
            if (fs.existsSync(filePath)) {
                // Aggiunta del file all'archivio ZIP
                zip.append(fs.createReadStream(filePath), { name: nomeFile });
            } else {
                console.warn(`Il file ${nomeFile} non esiste nella cartella fatture.`);
            }
        }
        await zip.finalize();


  } catch (error) {
    console.error('Si è verificato un errore durante il download delle fatture:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il download delle fatture'});
  }
})

module.exports = router;