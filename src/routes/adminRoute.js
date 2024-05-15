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
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
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
    if(!req.file){
        return res.render('errorPage',{error: 'Nessuna immagine caricata'});
    }
    const cf = req.body.cf; 
    const file = req.file;
 
    const webpBuffer = await sharp(file.buffer)
      .resize({ width: 800 })
      .toFormat('webp')
      .toBuffer();

    const fileName = cf + '_' + Date.now() + '.webp';
    const filePath = 'public/img/' + fileName;

    fs.writeFile(filePath, webpBuffer, async (err) => {
      if (err) {
        console.error('Errore durante il salvataggio del file:', err);
        return res.status(500).send('Errore durante il salvataggio del file');
      }

      const existingUser = await utenti.findOne({ cFiscale: cf });
      if (existingUser && existingUser.immagineProfilo) {
        const imagePath = 'public/img/' + existingUser.immagineProfilo;
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await utenti.findOneAndUpdate({ cFiscale: cf }, { immagineProfilo: fileName });

      res.redirect(`/userPage?cf=${cf}`);
    });
  });
});

module.exports = router;