const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const sharp = require('sharp');
const router = express.Router();

const admins = require('../DB/Admin');
const utenti = require('../DB/User');

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

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Solo file JPG, JPEG, o PNG sono consentiti!'));
    }
    cb(null, true);
  }
}).single('inputFile');

router.post('/uploadUserImage', (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      return res.status(400).send(err.message);
    }

    const cf = req.body.cf; // Recupera il codice fiscale dalla richiesta
    const file = req.file;

    // Ridimensiona e converte il file in formato WebP
    const webpBuffer = await sharp(file.buffer)
      .resize({ width: 800 }) // Ridimensiona a una larghezza massima di 800px
      .toFormat('webp') // Converti in formato WebP
      .toBuffer(); // Restituisci come buffer

    const fileName = cf + '_' + Date.now() + '.webp';
    const filePath = 'public/img/' + fileName;

    // Salva il file sul disco
    fs.writeFile(filePath, webpBuffer, async (err) => {
      if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
      }

      // Trova e elimina eventuali immagini precedenti associate a questo codice fiscale
      const existingUser = await utenti.findOne({ cFiscale: cf });
      if (existingUser && existingUser.immagineProfilo) {
        const imagePath = 'public/img/' + existingUser.immagineProfilo;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Elimina il file dall'hard disk
        }
      }

      // Salva il nome del nuovo file nel database
      await utenti.findOneAndUpdate({ cFiscale: cf }, { immagineProfilo: fileName });

      res.redirect('/profile'); // Reindirizza alla pagina del profilo
    });
  });
});

module.exports = router;