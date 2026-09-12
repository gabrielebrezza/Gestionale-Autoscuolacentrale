const nodemailer = require('nodemailer');

const mainTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.GMAIL_SECRET
    },
    tls: {
        rejectUnauthorized: false
    }
});

const rinnoviTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.RINNOVI_EMAIL,
        pass: process.env.RINNOVI_EMAIL_SECRET
    },
    tls: {
        rejectUnauthorized: false
    }
});


const sendEmail = async (email, subject, text, attachment = null) => {
    return new Promise((resolve, reject) => {
        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: subject,
            text: text
        };

        if (attachment) {
            if (Array.isArray(attachment)) {
                const attachments = [];
                attachment.forEach(fileName => {
                    attachments.push({path: fileName});
                });
                mailOptions.attachments = attachments;
            } else {
                mailOptions.attachments = {path: attachment};
            }
        }
        
        mainTransporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                reject(new Error('Errore nell\'invio dell\'email:'));
            } else {
                resolve(`email inviata con successo a ${email}`);
            }
        });
    });
}


function fillTemplate(data, email){
    const { numero_patente, data_scadenza, nomeECognome, daysLeft} = data;

    return  `
    <!DOCTYPE html>
    <html lang="it">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rinnovo Patente</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f4f4f4;
                margin: 0;
                padding: 0;
                }
                .email-container {
                    background: #ffffff;
                    padding: 20px;
                    margin: 20px auto;
                    width: 80%;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #333333;
                }
                a {
                    color: #4a80c0;
                    text-decoration: none;
                }
                .btn {
                    background-color: #4a80c0;
                    color: #ffffff;
                    padding: 10px 20px;
                    border-radius: 5px;
                    text-align: center;
                    display: inline-block;
                    text-decoration: none;
                }
                .logo {
                    display: block;
                    width: 200px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <img src="https://iscrizione-autoscuolacentrale.com/img/logo_rinnovopatenti.png" alt="Logo Rinnovopatenti" class="logo">
                <h1>La tua patente sta per scadere!</h1>
                <h3>Rinnovala con pochi click su <a href="https://www.rinnovopatenti.it">Rinnovopatenti.it</a> e <strong>risparmia</strong>!</h3>
                <p>Siamo il <strong>primo e più grande network italiano</strong> di studi autorizzati per il rinnovo della patente. 
                    Scegli tra le <strong>oltre 100 sedi in tutta Italia</strong>: troverai moltissime disponibilità di date ed orari, ed il <strong>prezzo più basso sul mercato</strong>.
                </p>
                <p>Gentile <strong>${nomeECognome != 'undefined' ? nomeECognome : ''}</strong>,</p>
                <p>la tua patente N. <strong>${numero_patente}</strong> scadrà tra ${daysLeft} il <strong>${data_scadenza}</strong>.</p>
                <p>Evita lo stress, prenota con pochi click.</p>
                <ul>
                    <li>Vai su <a href="https://www.rinnovopatenti.it">Rinnovopatenti.it</a>.</li>
                    <li>Scegli la città (puoi rinnovare ovunque, anche in una città diversa dalla tua residenza).</li>
                    <li>Seleziona lo studio e la data più comodi per te.</li>
                    <li>Prenota online compilando il form.</li>
                    <li>Se vuoi ridurre al minimo i tempi di permanenza nello studio medico, <strong>carica foto e firma</strong> direttamente al termine della prenotazione o in seguito, nell'<strong>area utenti</strong>.</li>
                </ul>
                <h3><strong>E dopo la visita?</strong></h3>
                <p>Riceverai la nuova patente con la scadenza aggiornata direttamente a casa, tramite posta assicurata, all'indirizzo che preferisci, anche se diverso da quello di residenza.</p>
                <a class="btn" style="color: #fff" href="https://www.rinnovopatenti.it">👉 Controlla subito studi, disponibilità e costi</a>
                <p><strong>Team Rinnovopatenti.it</strong></p>
                <a style="text-align: center" href="${process.env.SERVER_URL}/deleteEmailSubscription/${encodeURIComponent(email)}">Ho già rinnovato la patente (desidero non ricevere più email)</a>
            </div>
        </body>
    </html>`;
}

const deleteSubscriptionTemplate = `
    <!DOCTYPE html>
    <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rinnovo Patente</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #f4f4f4;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    background: #ffffff;
                    padding: 20px;
                    margin: 20px auto;
                    width: 80%;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #333333;
                }
                a {
                    color: #4a80c0;
                    text-decoration: none;
                }
                .btn {
                    background-color: #4a80c0;
                    color: #ffffff;
                    padding: 10px 20px;
                    border-radius: 5px;
                    text-align: center;
                    display: inline-block;
                    text-decoration: none;
                }
                .logo {
                    display: block;
                    width: 200px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <img src="https://iscrizione-autoscuolacentrale.com/img/logo_rinnovopatenti.png" alt="Logo Rinnovopatenti" class="logo">
                <h3>Hai annullato con successo l'iscrizione alle nostre email</h3>
                <p>Ci dispiace vederti andare! Non riceverai più comunicazioni da parte nostra riguardo promemoria, aggiornamenti o offerte sul rinnovo della patente.</p>
                <p>Grazie per averci scelto.<br>Il team di Rinnovopatenti</p>
            </div>
        </body>
    </html>`;


const sendRinnoviEmail = async (email, subject, data = null) => {
    return new Promise((resolve, reject) => {
        let mailOptions = {
            from: process.env.RINNOVI_EMAIL,
            to: email,
            subject: subject,
            html: data ? fillTemplate(data, email) : deleteSubscriptionTemplate,
            headers: {
                'List-Unsubscribe': `<${process.env.SERVER_URL}/deleteEmailSubscription/${encodeURIComponent(email)}>`
            }
        };
        
        rinnoviTransporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                reject(new Error('Errore nell\'invio dell\'email rinnovo patente:'));
            } else {
                resolve(`email rinnovo patente inviata con successo a ${email}`);
            }
        });
    });
}

module.exports = {sendEmail, sendRinnoviEmail};