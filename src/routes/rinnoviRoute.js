const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();
router.use(bodyParser.json({ limit: '50mb' }));

//databases
const rinnovi = require('../DB/Rinnovi');

//functions
const sendEmail = require('../utils/emailsUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const { rectanglesAreEqual } = require('pdf-lib');

router.get('/admin/rinnovi', authenticateJWT, async (req, res) =>{
    const users = await rinnovi.find({});
    res.render('admin/rinnovi/usersPage', {users})
});

router.get('/admin/rinnovi/addUser', authenticateJWT, async (req, res) =>{
    res.render('admin/rinnovi/addUser')
});
router.post('/rinnovi/addUser', authenticateJWT, async (req, res) => {
    const {nome, cognome, cf, email, tel, note, nPatente, protocollo} = req.body;
    let spedizione, visita, contatti;
    try {
        const [via, nCivico, cap, comune, provincia] = req.body.indirizzo.split(',');
        spedizione = {
            via: via.trim(),
            nCivico: nCivico.trim(),
            cap: cap.trim(),
            comune: comune.trim(),
            provincia: provincia.trim()
        }
        const [data, ora] = req.body.visita.split('T');
        visita = {
            data: data,
            ora: ora
        }
        contatti = {
            email: email,
            tel: tel
        }
    } catch (error) {
        return res.json({error: `Errore nel recupero dell'indirizzo`});
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
            return res.json({error: `Errore durante il salvataggio dell'utente`});
        });
});
router.post('/rinnovi/deleteUsers', authenticateJWT, async (req, res)=> {
    const {action} = req.body;
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        if(action == 'archivia'){
            for (const id of ids) {
                await rinnovi.findOneAndUpdate({"_id": id}, {"archiviato": true});
                console.log(`utente rinnovi ${id} archiviato`);
            }
        }else{
            for (const id of ids) {
                await rinnovi.deleteOne({"_id": id});
                console.log(`utente rinnovi ${id} eliminato definitivamente`);
            }
        }
        return res.redirect('/admin/rinnovi');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti rinnovi: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli alievi`});
    }
});

router.post('/rinnovi/upload/signature', authenticateJWT, async (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
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


router.post('/rinnovi/upload/profile', authenticateJWT, (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
    const base64Data = data.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
    const filePath = path.join('privateImages', 'immaginiRinnovi' , `${id}.png`);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Errore nel salvataggio della firma:', err);
            return res.status(500).json({ message: `Errore nel salvataggio dell'immagine rinnovi` });
        }
        res.status(200).json({ message: 'immagine rinnovi salvata con successo' });
    });
});


router.get('/admin/rinnovi/userPage', authenticateJWT, async (req, res)=> {
    const id = req.query.id;
    const user = await rinnovi.findOne({"_id": id});
    res.render('admin/rinnovi/userPage', {user});
});

module.exports = router;