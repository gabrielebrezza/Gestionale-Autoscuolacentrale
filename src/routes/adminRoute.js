const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const sharp = require('sharp');
const router = express.Router();

//databases
const admins = require('../DB/Admin');
const utenti = require('../DB/User');

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

router.post('/uploadUserFirma', (req, res) => {

  uploadFirmaPic(req, res, async function (err) {
    if (err) {
      return res.status(400).send(err.message);
    }
    if(!req.file){
        return res.render('errorPage',{error: 'Nessuna immagine caricata'});
    }
    const cf = req.body.cf; 
    const file = req.file;
 
    const webpBuffer = await sharp(file.buffer)
      .resize({ width: 236, height: 47, fit: 'cover', position: 'center' })
      .toFormat('jpg')
      .toBuffer();

    const fileName = cf + '_' + Date.now() + '.jpg';
    const filePath = 'public/img/firme/' + fileName;

    fs.writeFile(filePath, webpBuffer, async (err) => {
      if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
      }

      const existingUser = await utenti.findOne({ cFiscale: cf });
      if (existingUser && existingUser.firma) {
        const imagePath = 'public/img/firme/' + existingUser.firma;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      await utenti.findOneAndUpdate({ cFiscale: cf }, { firma: fileName });
      
      res.redirect(req.get('referer'));
    });
  });
});








router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post('/sendMessage', async (req, res) => {
  const {tel, content} = req.body;
  const phoneNumbers = tel.trim().split(' ');
  await sendMessage(phoneNumbers, content)
    .then(({ results, errorNumbers }) => {
        console.log('Tutti i messaggi sono stati processati.');
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
module.exports = router;