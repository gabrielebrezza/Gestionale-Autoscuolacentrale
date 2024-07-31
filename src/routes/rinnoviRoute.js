const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');

const router = express.Router();
router.use(bodyParser.json({ limit: '50mb' }));

//databases
const rinnovi = require('../DB/Rinnovi');
const SyncDate = require('../DB/SyncDate');
const storicoFattureGenerali = require('../DB/StoricoFattureGenerali');
const Credentials = require('../DB/Credentials');
const Scadenziario = require('../DB/Scadenziario');
//functions
const sendEmail = require('../utils/emailsUtils.js');
const { authenticateJWT } = require('../utils/authUtils.js');
const {searchUserPortale, searchExpirationPortale} = require('../utils/portaleAutomobilistaUtils.js');

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








router.post('/uploadUserImage', authenticateJWT, async (req, res) => {
    const data = req.body.image;
    const id = req.body.id;
    const location = req.body.location;
    try{
        const base64Data = data.replace(/^data:image\/jpeg;base64,/, "").replace(/\s/g, '');
        const filePath = path.join('privateImages', location , `${id}.jpeg`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(`Errore nel salvataggio dell'immagine ${location} ${err}`);
                return res.status(500).json({ message: `Errore nel salvataggio dell'immagine ${location}` });
            }
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
            data: dataVisita,
            ora: oraVisita
        },
        protocollo: dati.nProtocollo,
        numeroPatente: dati.nPatente,
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





async function trovaProvincia(cap) {
  try {
      const response = await axios.get('https://raw.githubusercontent.com/scgoeswild/comuni-localita-cap-italia/main/files/comuni-localita-cap-italia.json');
      const dataset = response.data["Sheet 1 - comuni-localita-cap-i"];
      
      const record = dataset.find(item => item.CAP === cap);
      return record ? record.Provincia : ' ';
  } catch (error) {
      console.error('Errore nel recupero del dataset:', error);
      return ' ';
  }
}

const fetchBookings = async () => {
    const GRAPHQL_URL = 'https://backend.rinnovopatenti.it/api/graphql';
    const AUTH_EMAIL = 'rinnovopatentimarconi@gmail.com';
    const AUTH_PASSWORD = 'Marconi@2024';
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
        if(AUTH_TOKEN.includes('html')) return;
        const currentDateTime = new Date();
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
                  via: utente.client.shippingAddress.trim(),
                  nCivico: utente.client.shippingAddressNumber.trim(),
                  cap: utente.client.shippingAddressCap.trim(),
                  comune: utente.client.shippingAddressPlace.trim(),
                  provincia: await trovaProvincia(utente.client.shippingAddressCap)
                }
                const realDate = new Date(utente.startDate);
                realDate.setHours(realDate.getHours() + 2);
                const [data, ora] = realDate.toISOString().slice(0, -8).split('T');
                const visita = {
                  data: data,
                  ora: ora
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
    const scadenziario = await Scadenziario.find();
    res.render('admin/rinnovi/scadenziario/usersPage', {scadenziario});
});

router.post('/admin/rinnovi/ricerca/scadenzaPatente', authenticateJWT, async (req, res) => {
    const { cFiscale } = req.body;
    try {
        const dati = await searchExpirationPortale(cFiscale);
        const spedizione = {
            via: `${dati.toponimo.toLowerCase()} ${dati.indirizzo.toLowerCase()}`,
            nCivico: dati.numeroCivico.toLowerCase(),
            cap: dati.cap.toLowerCase(),
            comune: dati.comune.toLowerCase(),
            provincia: dati.provincia.toLowerCase()
        };

        const saveUser = new Scadenziario({
            "nome": dati.nome.trim().toLowerCase(),
            "cognome": dati.cognome.trim().toLowerCase(),
            "cf": cFiscale.trim().toLowerCase(),
            "spedizione": spedizione,
            "nPatente": dati.numeroPatente.trim(),
            "expPatente": dati.expPatente
        });

        await saveUser.save();
        res.redirect(`/admin/rinnovi/scadenziario`);
    } catch (error) {
        console.error('Errore durante la richiesta POST:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.post('/admin/rinnovi/ricerca/portaleAutomobilista', authenticateJWT, async (req, res) => {
    const { cFiscale, cognome, nPatente } = req.body;
    try {
        const formData = await searchUserPortale(cFiscale, cognome, nPatente);
        const spedizione = {
            via: `${formData.toponimo.toLowerCase()} ${formData.indirizzo.toLowerCase()}`,
            nCivico: formData.numeroCivico.toLowerCase(),
            cap: formData.cap.toLowerCase(),
            comune: formData.comune.toLowerCase(),
            provincia: formData.provinciaResidenza.toLowerCase()
        };

        const saveUser = new rinnovi({
            "nome": formData.nome.trim().toLowerCase(),
            "cognome": formData.cognome.trim().toLowerCase(),
            "cf": formData.codiceFiscale.trim().toLowerCase(),
            "spedizione": spedizione,
            "nPatente": formData.numeroPatente.trim(),
        });

        await saveUser.save();
        const user = await rinnovi.findOne({"nPatente": formData.numeroPatente.trim()});
        console.log(`Nuovo utente rinnovi salvato: ${formData.nome.trim().toLowerCase()} ${formData.cognome.trim().toLowerCase()}`);
        res.redirect(`/admin/rinnovi/userPage?id=${encodeURIComponent(`${user._id}`)}`);
    } catch (error) {
        console.error('Errore durante la richiesta POST:', error);
        res.render('errorPage', {error: 'Errore durante il collegamento al portale' });
    }
});

router.get('/admin/rinnovi/credenzialiPortale', authenticateJWT, async(req, res)=>{
    const credenziali = await Credentials.findOne();
    res.render('admin/rinnovi/credenziali', { user: credenziali.user, password: credenziali.password, pin: credenziali.pin});
});

router.post('/admin/rinnovi/updateCredentials', authenticateJWT, async(req, res)=>{
    const { username, password, pin} = req.body
    await Credentials.updateOne({"user": username, "password": password, "pin": pin});
    res.redirect('/admin/rinnovi/credenzialiPortale');
});

module.exports = router;
