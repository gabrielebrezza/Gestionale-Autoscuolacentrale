const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(bodyParser.json({ limit: '10mb' }));

//databases
const rinnovi = require('../DB/Rinnovi');

//functions
const sendEmail = require('../utils/emailsUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');

router.get('/admin/rinnovi', authenticateJWT, async (req, res) =>{
    const users = await rinnovi.find({});
    res.render('admin/rinnovi/usersPage', {users})
});

router.get('/admin/rinnovi/addUser', authenticateJWT, async (req, res) =>{
    res.render('admin/rinnovi/addUser')
});
router.post('/rinnovi/addUser', authenticateJWT, async (req, res) => {
    const {nome, cognome, cf, email, tel, note, nPatente, protocollo} = req.body;
    const [via, nCivico, cap, comune, provincia] = req.body.indirizzo.split(',');
    const spedizione = {
        via: via.trim(),
        nCivico: nCivico.trim(),
        cap: cap.trim(),
        comune: comune.trim(),
        provincia: provincia.trim()
    }
    const [data, ora] = req.body.visita.split('T');
    const visita = {
        data: data,
        ora: ora
    }
    const contatti = {
        email: email,
        tel: tel
    }
    const saveUser = new rinnovi({
        "nome": nome.trim(),
        "cognome": cognome.trim(),
        "cf": cf.trim(),
        "contatti": contatti,
        "spedizione": spedizione,
        "visita": visita,
        "nPatente": nPatente.trim(),
        "protocollo": protocollo.trim(),
        "note": note
    });
        saveUser.save()
        .then(() => {
            console.log(`Nuovo utente rinnovi salvato: ${nome} ${cognome}`);
            return res.json({ message: 'Dati salvati con successo!', id: saveUser._id });
        })
        .catch((errore) => {
            console.error(`Errore durante il salvataggio del nuovo utente rinnovi: ${errore}`);
            return res.render('errorPage', {error: `errore durante il salvataggio dell'utente`});
        });
});
router.post('/rinnovi/deleteUsers', authenticateJWT, async (req, res)=> {
    const ids = req.body;
    try {
        for (const id of Object.values(ids)) {
            await rinnovi.deleteOne({"_id": id});
            console.log(`utente rinnovi ${id} eliminato definitivamente`);
        }
        return res.redirect('/admin/rinnovi');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti rinnovi: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli alievi`});
    }
});

router.post('/rinnovi/saveSignature', authenticateJWT, async (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
    console.log(id);
    const base64Data = data.replace(/^data:image\/png;base64,/, "");
    const filePath = path.join('privateImages', 'firmeRinnovi' , `${id}.png`);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Errore nel salvataggio della firma:', err);
            return res.status(500).json({ message: 'Errore nel salvataggio della firma' });
        }
        res.status(200).json({ message: 'Firma salvata con successo' });
    });
});

module.exports = router;