const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const exceljs = require('exceljs');

const router = express.Router();
router.use(bodyParser.json({ limit: '900mb' }));
router.use(bodyParser.urlencoded({ limit: '900mb', extended: true }));
//databases
const admins = require('../DB/Admin');
const rinnovi = require('../DB/Rinnovi');
const SyncDate = require('../DB/SyncDate');
const storicoFattureGenerali = require('../DB/StoricoFattureGenerali');
const Credentials = require('../DB/Credentials');
const Scadenziario = require('../DB/Scadenziario');
const Duplicati = require('../DB/Duplicati');
const programmaScadenziario = require('../DB/programmaScadenziario');
const infoScadenziario = require('../DB/infoScadenziario');
const utentiIscrizioni = require('../DB/User');
//functions
const {sendEmail, sendRinnoviEmail} = require('../utils/emailsUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const {searchUserPortale, searchExpirationPortale, searchScheduleExpirationPortale} = require('../utils/portaleAutomobilistaUtils.js');
const { trovaProvincia } = require('../utils/genericUtils.js');
const { creaGiornale, creaGiornaleExcel } = require('../utils/compileUtils.js');
router.get('/admin/rinnovi', authenticateJWT, async (req, res) =>{
    const users = await rinnovi.find({});
    res.render('admin/rinnovi/usersPage', {users})
});

router.post('/admin/rinnovi/download/:type', authenticateJWT, async (req, res) => {
    try {
        const fromDate = req.body.fromDate || new Date(0);
        const toDate = req.body.toDate || new Date();
        const users = await rinnovi.find({
            "visita.data": { $gte: new Date(fromDate), $lte: new Date(toDate)},
            "archiviato": true
        });
        const sortedUsers = users.sort((u1, u2) => u1.visita.data - u2.visita.data)
        if(req.params.type == 'pdf'){
            const giornale = await creaGiornale(sortedUsers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="giornale.pdf"');

            return res.end(giornale);
        }
        if(req.params.type == 'xlsx'){
            const excelFile = await creaGiornaleExcel(sortedUsers)
            res.setHeader('Content-Disposition', 'attachment; filename="giornale.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            await excelFile.write(res);
            return res.end();
        }

        console.log('Tipo non valido');
        res.status(400).send('Tipo di file non valido');
    } catch (error) {
        console.error('Errore durante la generazione del file:', error);
        res.status(500).send('Si è verificato un errore durante la generazione del file');
    }
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
            via: via.toLowerCase().replace(/\s+/g, " ").trim(),
            nCivico: nCivico.toLowerCase().replace(/\s+/g, "").trim(),
            cap: cap.trim(),
            comune: comune.toLowerCase().replace(/\s+/g, " ").trim(),
            provincia: provincia.trim()
        }
        const [data, ora] = req.body.visita.split('T');
        visita = {
            data: new Date(`${data}T00:00:00Z`),
            ora: ora
        }
        contatti = {
            email: email,
            tel: tel
        }
    } catch (error) {
        return res.status(500).json({error: 'Errore nel recupero dell\'indirizzo'});
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
        "creationDate": new Date(),
        "note": note
    });
        saveUser.save()
        .then(() => {
            console.log(`Nuovo utente rinnovi salvato: ${nome} ${cognome}`);
            return res.status(200).json({ message: 'Dati salvati con successo!', id: saveUser._id });
        })
        .catch((error) => {
            console.error(`Errore durante il salvataggio del nuovo utente rinnovi: ${error}`);
            return res.status(500).json({error: 'Errore durante il salvataggio dell\'utente'});
        });
});
router.post('/rinnovi/deleteUsers', authenticateJWT, async (req, res)=> {
    const {action} = req.body;
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        if(action == 'archive'){
            for (const id of ids) {
                await rinnovi.findOneAndUpdate({"_id": id}, {"archiviato": true});
                console.log(`utente rinnovi ${id} archiviato`);
            }
        }else if(action == 'unarchive'){
            for (const id of ids) {
                await rinnovi.findOneAndUpdate({"_id": id}, {"archiviato": false});
                console.log(`utente rinnovi ${id} disarchiviato`);
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
router.get('/admin/rinnovi/pagamenti', async (req, res) => {
    const pagamenti = await rinnovi.findOne({"_id": req.query.id}, {"fatture": 1}); 
    if(!pagamenti.fatture.data) return res.render('errorPage', {error: "Questo utente non ha effetuato ancora un pagamento"});
    res.render('admin/rinnovi/payments/storicoPagamenti',{pagamento: pagamenti.fatture})
});








router.post('/uploadUserImage', async (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
    const location = req.body.location;
    try{
        const base64Data = data.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
        const filePath = path.join('privateImages', location , `${id}.jpeg`);
        fs.writeFile(filePath, base64Data, 'base64', async (err) => {
            if (err) {
                console.error(`Errore nel salvataggio dell'immagine ${location} ${err}`);
                return res.status(500).json({ message: `Errore nel salvataggio dell'immagine ${location}` });
            }
            if(location == 'immaginiRinnovi') await Rinnovi.findOneAndUpdate({"_id": id}, {"hasPhoto": true});
            if(location == 'firmeRinnovi') await Rinnovi.findOneAndUpdate({"_id": id}, {"hasSign": true});
            if(location == 'immaginiIscrizioni') await utentiIscrizioni.findOneAndUpdate({"_id": id}, {"hasPhoto": true});
            if(location == 'firmeIscrizioni') await utentiIscrizioni.findOneAndUpdate({"_id": id}, {"hasSign": true});
            res.status(200).json({ message: 'immagine salvata con successo' });
        });
    }catch(err){
        console.error(`si è verificato un errore ${err}`);
    }
});

router.delete('/deleteUserImage', authenticateJWT, async (req, res) => {
    const { id, location } = req.body;
    const filePath = path.join('privateImages', location , `${id}.jpeg`);
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
        if(location == 'immaginiRinnovi') await Rinnovi.findOneAndUpdate({"_id": id}, {"hasPhoto": false});
        if(location == 'firmeRinnovi') await Rinnovi.findOneAndUpdate({"_id": id}, {"hasSign": false});
        if(location == 'immaginiIscrizioni') await utentiIscrizioni.findOneAndUpdate({"_id": id}, {"hasPhoto": false});
        if(location == 'firmeIscrizioni') await utentiIscrizioni.findOneAndUpdate({"_id": id}, {"hasSign": false});
        res.status(200).json({ message: 'Immagine eliminata con successo' });
    } catch (err) {
        console.error(`Errore durante l'eliminazione dell'immagine:`, err);
        res.status(500).send(`Errore durante l'eliminazione dell'immagine`);
    }
});

router.get('/admin/rinnovi/userPage', authenticateJWT, async (req, res)=> {
    const id = req.query.id;
    const user = await rinnovi.findOne({"_id": id});
    res.render('admin/rinnovi/userPage', {user});
});


router.post('/rinnovi/updateUser', authenticateJWT, async (req, res)=> {
    const id = req.body.id;
    const dati = req.body;
    const [dataVisita, oraVisita] = dati.visita.split('T');
    const userData= {
        nome: dati.nome,
        cognome: dati.cognome,
        cf: dati.cf,
        contatti: {
            email: dati.email,
            tel: dati.tel,
        },
        spedizione: {
            via: dati.viaResidenza,
            nCivico: dati.civicoResidenza,
            cap: dati.capResidenza,
            comune: dati.comuneResidenza,
            provincia: dati.provinciaResidenza,
        },
        visita: {
            data: new Date(`${dataVisita}T00:00:00Z`),
            ora: oraVisita
        },
        protocollo: dati.nProtocollo,
        nPatente: dati.nPatente,
        note: dati.note
    };
    await rinnovi.findOneAndUpdate({"_id": id}, userData);
    res.redirect(`/admin/rinnovi/userPage?id=${id}`);
});
router.post('/admin/rinnovi/downloadFattura', authenticateJWT, async (req, res)=> {
    try {
        console.log(req.body.numero)
        const fattura = await storicoFattureGenerali.findOne({"tipo": 'rinnovo', "numero": req.body.numero});
        if (fattura) {
            const filePath = path.join(__dirname, '../../fatture', 'elettroniche', fattura.nomeFile);
            if (fs.existsSync(filePath)) {
                res.set('Content-Type', 'application/xml');
                res.set('Content-Disposition', `attachment; filename="${fattura.nomeFile}"`);
        
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            } else {
                console.warn(`Il file ${fattura.nomeFile} non esiste nella cartella fatture.`);
                res.status(404).send('File not found');
            }
        } else {
            console.warn(`Nessuna fattura trovata per il numero ${req.body.numero}.`);
            res.status(404).send('Fattura non trovata');
        }
    } catch (error) {
        console.error('Si è verificato un errore durante il download della fattura rinnovi:', error);
    res.render('errorPage', {error: 'Si è verificato un errore durante il download della fattura'});
    }
});

const fetchBookings = async () => {
    if(process.env.SERVER_URL == 'http://localhost') return;
    const GRAPHQL_URL = process.env.GRAPHQL_URL_RINNOVO;
    const AUTH_EMAIL = process.env.AUTH_EMAIL_RINNOVO;
    const AUTH_PASSWORD = process.env.AUTH_PASSWORD_RINNOVO;
    const authenticate = async () => {
        try {
            const authQuery = `
            mutation {
                authenticateUserWithPassword(email: "${AUTH_EMAIL}", password: "${AUTH_PASSWORD}") {
                    ... on UserAuthenticationWithPasswordSuccess {
                        sessionToken
                    }
                    ... on UserAuthenticationWithPasswordFailure {
                        message
                    }
                }
            }`;

            const authData = JSON.stringify({ query: authQuery });

            const authOptions = {
                hostname: new URL(GRAPHQL_URL).hostname,
                path: new URL(GRAPHQL_URL).pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(authData),
                },
            };
            
            return new Promise((resolve, reject) => {
                const req = https.request(authOptions, (res) => {
                    let body = '';

                    res.on('data', (chunk) => {
                        body += chunk;
                    });

                    res.on('end', () => {
                        const response = JSON.parse(body);
                        if (response.data.authenticateUserWithPassword.sessionToken) {
                            resolve(response.data.authenticateUserWithPassword.sessionToken);
                        } else {
                            reject('Authentication failed: ' + response.data.authenticateUserWithPassword.message);
                        }
                    });
                });

                req.on('error', (e) => {
                    reject(e);
                });

                req.write(authData);
                req.end();
            });
        } catch (error) {
            console.error(`si è verificato un errore nell'autenticazione dell'API ${error}`)
        }
    };
    try {
        
        const AUTH_TOKEN = await authenticate();
        if(AUTH_TOKEN.includes('html')) return console.log('Ricevuta risposta errata da rinnovo patenti');
        const currentDateTime = new Date(Date.now() - 10 * 60 * 60 * 1000);
        const lastSync = await SyncDate.findOne()
        await SyncDate.updateOne({"data": currentDateTime.toISOString()})
        
        const query = `
        query MarconiBookings {
            bookings(
                where: {
                    visitInfo: { study: { name: { equals: "Rinnovopatenti Marconi" } } }
                    payment: { payed: { equals: true } }
                    createdAt: { gt: "${lastSync.data}" }
                }
                orderBy: { id: desc }
            ) {
                id
                code
                totalCost
                startDate
                endDate
                createdAt
                updatedAt
                enabled
                payment {
                    id
                    payed
                }
                client {
                    name
                    surname
                    fiscalCode
                    email
                    phone
                    shippingAddress
                    shippingAddressCap
                    shippingAddressNumber
                    shippingAddressPlace
                    licenseNumber
                }
            }
        }`;

        const data = JSON.stringify({ query }); 

        const url = new URL(GRAPHQL_URL);
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        };

        const req = https.request(options,  (res) => {
          let body = '';

          res.on('data', (chunk) => {
              body += chunk;
          });

          res.on('end', async () => {
              const responseData = JSON.parse(body);
              if (!responseData.data.bookings || Object.keys(responseData.data.bookings).length == 0) return;
              const bookings = responseData.data.bookings;
              for(const utente of bookings){
                const userExist = await rinnovi.findOne({"cf": utente.client.fiscalCode.trim()});
                if(!utente.enabled || userExist) continue;

                const spedizione = {
                    via: utente.client.shippingAddress.toLowerCase().replace(/\s/g, " ").trim(),
                    nCivico: utente.client.shippingAddressNumber.toLowerCase().replace(/\s/g, "").trim(),
                    cap: utente.client.shippingAddressCap.trim(),
                    comune: utente.client.shippingAddressPlace.toLowerCase().replace(/\s/g, " ").trim(),
                    provincia: await trovaProvincia(utente.client.shippingAddressCap.trim())
                }
                const realDate = new Date(utente.startDate);
                realDate.setHours(realDate.getHours() + 1);
                const [data, ora] = realDate.toISOString().slice(0, -8).split('T');
                const newHour = `${String(Number(ora.split(':')[0]) + 1).padStart(2, '0')}:${ora.split(':')[1]}`
                const visita = {
                  data: new Date(`${data}T00:00:00Z`),
                  ora: newHour
                }
                const contatti = {
                  email: utente.client.email,
                  tel: utente.client.phone
                }
                const saveUser = new rinnovi({
                  "nome": utente.client.name.trim(),
                  "cognome": utente.client.surname.trim(),
                  "cf": utente.client.fiscalCode.trim(),
                  "contatti": contatti,
                  "spedizione": spedizione,
                  "visita": visita,
                  "nPatente": utente.client.licenseNumber.trim(),
                  "protocollo": null,
                  "creationDate": new Date(),
                  "note": null
                });
                await saveUser.save()
                .then(() => {
                    console.log(`Nuovo utente rinnovi salvato: ${saveUser.nome} ${saveUser.cognome}`);
                })
                .catch((error) => {
                    return console.error(`Errore durante il salvataggio del nuovo utente rinnovi: ${error}`);
                });
              } 
          });
        });

        req.on('error', (error) => {
            console.error('Errore:', error);
        });

        req.write(data);
        req.end();
    } catch (error) {
        console.error(`Errore durante il recupero dei dati dall'API: ${error}`);
    }
};
setInterval(fetchBookings, 600000);

setTimeout(fetchBookings, 5000);

router.get('/admin/rinnovi/scadenziario', authenticateJWT, async (req, res) => {
    const { role } = await admins.findOne({"email": req.user.email});

    const page = 1;
    const limit = 100;
    const skip = (page - 1) * limit; 

    const totalUsers = await Scadenziario.countDocuments();
    const scadenziario = await Scadenziario.find().skip(skip).limit(limit);
    const info = await infoScadenziario.findOne();

    const totalScheduledUsers = await programmaScadenziario.countDocuments();
    res.render('admin/rinnovi/scadenziario/usersPage', {
        scadenziario,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        totalScheduledUsers,
        info,
        isSearching,
        role
    });
});
router.get('/admin/rinnovi/scadenziario/data', authenticateJWT, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;

    const scadenziario = await Scadenziario.find().skip(skip).limit(limit);
    const totalUsers = await Scadenziario.countDocuments();

    res.json({
        scadenziario,
        skip: skip,
        hasMore: skip + scadenziario.length < totalUsers
    });
});


router.post('/admin/rinnovi/scadenziario/deleteUsers', authenticateJWT, async (req, res)=> {
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        for (const id of ids) {
            await Scadenziario.deleteOne({"_id": id});
            console.log(`utente scadenziario ${id} eliminato definitivamente`);
        }
        return res.redirect('/admin/rinnovi/scadenziario');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti scadenziario: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli alievi`});
    }
});

(async () => {
    const duplicati = await Scadenziario.aggregate([
        {
            $group: {
                _id: "$cf",
                ids: { $push: "$_id" },
                count: { $sum: 1 }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);

    for (const doc of duplicati) {
        const [keep, ...remove] = doc.ids;
        await Scadenziario.deleteMany({ _id: { $in: remove } });
    }
});

// router.post('/admin/programmaScadenziario', authenticateJWT, async (req, res) => {
//     try {
//         let users = req.body.users.split(',');
//         users = users.map(u => u.trim());
//         const schedule = await programmaScadenziario.find();
        
//         const receivedUsers = new Set(users);
        
//         const scheduledUsers = new Set(schedule.map(p => p.cf));
//         const filteredUsers = [...receivedUsers].filter(user => !scheduledUsers.has(user));
        
//         for (const u of filteredUsers) {
//             if(u && u.length == 16){
//                 const userExist = await Scadenziario.findOne({'cf': u.toUpperCase().trim() });
//                 if(userExist){
//                     await programmaScadenziario.deleteOne({'cf': u.toUpperCase().trim() });
//                     continue;
//                 } 
//                 const newUser = new programmaScadenziario({
//                     cf: u.toUpperCase()
//                 });
//                 await newUser.save();
//             }
//         }
        
//         await programmaScadenziario.deleteMany({ cf: { $nin: [...receivedUsers] } });
//         res.redirect('/admin/rinnovi/scadenziario')
//     } catch (error) {
//         console.log(`An error occured while programming the retrive for license expiration date: ${error}`)
//     }
// });

const cron = require("node-cron");
const Rinnovi = require('../DB/Rinnovi');
const utenti = require('../DB/User');
let isSearching = false;

async function searchAndUpdate() {
    console.log("🔄 Avvio ricerca scadenze patente degli utenti programmati");
    try {
        const { totalErrors } = await searchScheduleExpirationPortale();
        await infoScadenziario.updateOne({}, { $inc: { "totalErrors": totalErrors } });
    } catch (error) {
        console.log(`Errore durante l'elaborazione delle scadenze patente: ${error}`);
    }
    isSearching = false;
}

async function trySearchAndUpdate() {
    if (isSearching) {
        console.log("🔄 La ricerca è già in corso. Riproverò tra 5 minuti...");
        setTimeout(async () => {
            await trySearchAndUpdate(); // Riprova dopo 5 minuti
        }, 5 * 60 * 1000); // 5 minuti in millisecondi
        return;
    }

    isSearching = true;
    await searchAndUpdate();
}

function isValidExecutionTime() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    return day >= 1 && day <= 6 && hour >= 6 && hour <= 20;
}

async function notifyExpirations() {
    let deadLine = new Date();
    deadLine = new Date(deadLine.setMonth(deadLine.getMonth() + 4)).setHours(0, 0, 0, 0);
    const users = await Scadenziario.find({$and: [
      { expPatente: { $lte: deadLine } },
      { expPatente: { $gte: new Date() } }
    ]});
    const notificationMessages = {
        124: "4 mesi",
        93: "3 mesi",
        62: "2 mesi",
        31: "1 mese",
        14: "14 giorni",
        7: "7 giorni",
        4: "4 giorni",
        3: "3 giorni",
        2: "2 giorni",
        1: "1 giorno"
    };
    for (const u of users) {
        const daysLeft = Math.ceil((u.expPatente - new Date())/ (1000 * 60 * 60 * 24));
        const emailNumber = [124, 93, 62, 31, 14, 7, 4, 3, 2, 1].indexOf(daysLeft) + 1;
        if (daysLeft && notificationMessages[daysLeft] && u.totalEmailSentCount < emailNumber && !u.isEmailUnsubscribed) {
            const nomeECognome = u?.nomeECognome?.replace(/\s+/g, ' ').trim().toLowerCase().split(' ').map(p => `${p[0]?.toUpperCase()}${p?.slice(1)}`).join(' ');
            const data = {nomeECognome: nomeECognome, numero_patente: u.nPatente, data_scadenza: u.expPatente.toLocaleDateString('IT-it'), daysLeft: notificationMessages[daysLeft]}

            try {
                const response = await sendRinnoviEmail(u.email, 'La tua Patente sta per Scadere!', data)
                await Scadenziario.findOneAndUpdate({"_id": u._id}, {"totalEmailSentCount": emailNumber});
                console.log(response);
            } catch (error) {
                console.log(error);
            }
        }
    }
}

if (process.env.SERVER_URL != 'http://localhost') {
    if (isValidExecutionTime()) {
        trySearchAndUpdate(); // Esegui subito se l'orario è valido
    }

    cron.schedule("0 6-20/2 * * 1-6", async () => {
        await trySearchAndUpdate(); // Controlla se può eseguire la ricerca ogni 2 ore
    });

    cron.schedule("0 9,13 * * *", async () => {
        console.log('🔄 Eseguo L\'invio delle email per i rinnovi')
        await notifyExpirations();
    });
}
router.get('/deleteEmailSubscription/:email', async (req, res) =>{
    try {
        console.log('elimino iscrizione', req.params.email);
        const i = await Scadenziario.findOneAndUpdate({"email": req.params.email}, {"isEmailUnsubscribed": true});
        res.send(`<script>window.close();</script>`)
    } catch (error) {
        console.log('si è verificato un errore', error)
    }
})
// (async() => {
//     try {
//         const utentiIsc = await utentiIscrizioni.find();
//         let usersWithImages = 0;
//         for (const u of utentiIsc) {
//             try {
//                 const response = await fetch(`https://iscrizione-autoscuolacentrale.com/images?dir=immaginiIscrizioni%2F${u._id}.jpeg`, {"headers": {"cookie": "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyZXp6YWdhYnJpZWxlMEBnbWFpbC5jb20iLCJpYXQiOjE3NDQzNzY1NzIsImV4cCI6MTc0NDYzNTc3Mn0.5rHY1rHtlvQqV2-Gh6diysZ5LaLNqve-dlAvS4qDlyA"}});
            
//                 if(response.status == 200){
//                     await utentiIscrizioni.findOneAndUpdate({"_id": u._id}, {"hasPhoto": true});
//                     usersWithImages++;
//                     console.log(usersWithImages)
//                 }
//             } catch (error) {
//                 console.error(error)
//             }
//         }
//     } catch (e) {
//         console.log(`errore: ${e}`)
//     }
// })();
router.post('/admin/rinnovi/scadenziario/downloadExcel', authenticateJWT, async (req, res) =>{
    try {
        const users = await Scadenziario.find();
    
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Scadenziario');
    
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        const headerFont = { bold: true };
        const headers = ['Nome e Cognome', 'Codice Fiscale', 'Residenza', 'Email', 'Numero Patente', 'Scadenza'];
        const columns = [];

        headers.forEach(h => columns.push({ header: h, key: h, width: 50 }));
    
        worksheet.columns = columns;
    
        const headerRow = worksheet.getRow(1);
        headerRow.fill = headerFill;
        headerRow.font = headerFont;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        for (const u of users) {
            const row = [
                u.nomeECognome,
                u.cf,
                u.residenza,
                u.email,
                u.nPatente,
                u.expPatente.toLocaleDateString('it-IT')
            ]
            
            const rowNumber = worksheet.addRow(row).number;
            worksheet.getRow(rowNumber).height = 20;
    
            worksheet.getRow(rowNumber).eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        }
        res.setHeader('Content-Disposition', 'attachment; filename="scadenziario.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(`an error occured while downloading the excel file, ${error}`)
    }
});

async function readExcel(filePath) {
    const cfRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const usersArr = worksheet.getSheetValues()
    .filter(row => 
      Array.isArray(row) &&
      row[1] && row[2] &&
      (typeof row[3] === 'string' && cfRegex.test(row[3])) &&
      (typeof row[8] === 'string' && emailRegex.test(row[8]))
    )
    .map(u => ({
      nomeECognome: `${u[2]} ${u[1]}`,
      email: u[8],
      cf: u[3],
      residenza: null,
      try: 0
    }));
    const seenCF = new Set();
    const filteredUsers = usersArr.filter(user => {
        if (seenCF.has(user.cf.toUpperCase())) return false;
        seenCF.add(user.cf.toUpperCase());
        return true;
    });
    if (filteredUsers.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < filteredUsers.length; i += batchSize) {

            const batch = filteredUsers.slice(i, i + batchSize);
            await programmaScadenziario.insertMany(batch, { ordered: false });
            console.log(`${batch.length} documenti inseriti in MongoDB.`);
        }
    } else {
        console.log("Nessun documento da inserire.");
    }
}

// readExcel(path.resolve('rinnovi.xlsx'));

router.post('/admin/rinnovi/scadenziario/search', authenticateJWT, async (req, res) => {
    const { cFiscale, email } = req.body;
    try {
        const dati = await searchExpirationPortale(cFiscale);
        const residenza = `
            ${dati.toponimo.toLowerCase().replace(/\s+/g, " ").trim()} ${dati.indirizzo.toLowerCase().replace(/\s/g, " ").trim()}
            ${dati.numeroCivico.toLowerCase().replace(/\s+/g, "").trim()},
            ${dati.cap.trim()},
            ${dati.comune.toLowerCase().replace(/\s+/g, " ").trim()},
            (${await trovaProvincia(dati.cap.trim())})`;
        const saveUser = new Scadenziario({
            "nomeECognome": `${dati.nome.trim().replace(/\s+/g, " ").toLowerCase()} ${dati.cognome.trim().replace(/\s+/g, " ").toLowerCase()}`,
            "cf": cFiscale.trim().replace(/\s+/g, "").toUpperCase(),
            "email": email,
            "residenza": residenza,
            "nPatente": dati.numeroPatente.trim(),
            "expPatente": dati.expPatente
        });

        await saveUser.save();
        res.redirect(`/admin/rinnovi/scadenziario`);
    } catch (error) {
        console.error('Errore durante la richiesta POST scadenziario:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.post('/admin/rinnovi/ricerca/portaleAutomobilista', authenticateJWT, async (req, res) => {
    const { cFiscale, cognome, nPatente } = req.body;
    try {
        const formData = await searchUserPortale(cFiscale, cognome, nPatente);
        const spedizione = {
            via: `${formData.toponimo.toLowerCase().replace(/\s+/g, " ").trim()} ${formData.indirizzo.toLowerCase().replace(/\s/g, " ").trim()}`,
            nCivico: formData.numeroCivico.toLowerCase().replace(/\s+/g, "").trim(),
            cap: formData.cap.trim(),
            comune: formData.comune.toLowerCase().replace(/\s+/g, " ").trim(),
            provincia: await trovaProvincia(formData.cap.trim())
        };
        const saveUser = new rinnovi({
            "nome": formData.nome.replace(/\s+/g, " ").trim().toLowerCase(),
            "cognome": formData.cognome.replace(/\s+/g, " ").trim().toLowerCase(),
            "cf": formData.codiceFiscale.replace(/\s+/g, "").toUpperCase(),
            "spedizione": spedizione,
            "nPatente": formData.numeroPatente.trim(),
            "creationDate": new Date()
        });

        await saveUser.save();
        const user = await rinnovi.findOne({"nPatente": formData.numeroPatente.trim()});
        console.log(`Nuovo utente rinnovi salvato: ${formData.nome.trim().toLowerCase()} ${formData.cognome.trim().toLowerCase()}`);
        res.redirect(`/admin/rinnovi/userPage?id=${encodeURIComponent(`${user._id}`)}`);
    } catch (error) {
        console.error('Errore durante la richiesta POST portale automobilista rinnovi:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.get('/admin/rinnovi/credenzialiPortale', authenticateJWT, async(req, res)=>{
    const credenziali = await Credentials.findOne();
    res.render('admin/rinnovi/credenziali', { user: credenziali.user, password: credenziali.password, pin: credenziali.pin});
});

router.post('/admin/rinnovi/updateCredentials', authenticateJWT, async (req, res)=>{
    const { username, password, pin} = req.body
    await Credentials.updateOne({"user": username, "password": password, "pin": pin});
    res.redirect('/admin/rinnovi/credenzialiPortale');
});







router.get('/admin/duplicati', authenticateJWT, async (req, res)=>{
    const users = await Duplicati.find();
    res.render('admin/duplicati/usersPage', {users});
});

router.post('/duplicati/deleteUsers', authenticateJWT, async (req, res)=> {
    const {action} = req.body;
    const ids = (Object.keys(req.body)
        .filter(key => key.startsWith('user')))
        .map(key => req.body[key]);
    try {
        if(action == 'archive'){
            for (const id of ids) {
                await Duplicati.findOneAndUpdate({"_id": id}, {"archiviato": true});
                console.log(`utente duplicati ${id} archiviato`);
            }
        }else if(action == 'unarchive'){
            for (const id of ids) {
                await Duplicati.findOneAndUpdate({"_id": id}, {"archiviato": false});
                console.log(`utente duplicati ${id} disarchiviato`);
            }
        }else{
            for (const id of ids) {
                await Duplicati.deleteOne({"_id": id});
                console.log(`utente duplicati ${id} eliminato definitivamente`);
            }
        }
        return res.redirect('/admin/duplicati');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti duplicati: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione dell'utente`});
    }
});


router.get('/admin/duplicati/userPage', authenticateJWT, async (req, res)=>{
    const user = await Duplicati.findOne({"_id": req.query.id});
    res.render('admin/duplicati/userPage', {user});
});



router.post('/admin/duplicati/updateUser', authenticateJWT, async (req, res)=>{
    const dati = req.body;
    try {
        const cleanData = (data) => {
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].trim().toLowerCase();
                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    cleanData(data[key]);
                }
            }
        };
        cleanData(dati);
        const user = await Duplicati.findOneAndUpdate({"_id": dati.id}, dati);
        res.redirect(`/admin/duplicati/userPage?id=${encodeURIComponent(`${dati.id}`)}`);
    } catch (error) {
        console.error(`Si è verificato un errore nell'aggiornamento dell'utente duplicati: ${error}`);
        res.render('errorPage', {error: 'errore nell\'aggiornamento utente'})
    }
    
});

router.get('/admin/duplicati/addUser', authenticateJWT, async (req, res)=>{
    res.render('admin/duplicati/addUser')
});


router.post('/admin/duplicati/saveUser', authenticateJWT, async (req, res)=>{
    const dati = req.body;
    const imageData = dati.imageData;
    try {
        const cleanData = (data) => {
            for (let key in data) {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].trim().toLowerCase();
                } else if (typeof data[key] === 'object' && data[key] !== null) {
                    cleanData(data[key]);
                }
            }
        };
        cleanData(dati);
        const saveUser = new Duplicati(dati);
        await saveUser.save();
        const user = await Duplicati.findOne({"cf": dati.cf});
        const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
        const filePath = path.join('privateImages', 'immaginiDuplicati', `${user._id}.jpeg`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(`Errore nel salvataggio dell'immagine: ${err}`);
                return res.status(500).json({ message: 'Errore nel salvataggio dell\'immagine' });
            }
            res.redirect('/admin/duplicati/addUser');
        });
    } catch (error) {
        console.log('errore nel salvataggio utente duplicati: ', error);
        res.render('errorPage', {error: 'errore nel salvataggio utente'});
    }
});

module.exports = router;
