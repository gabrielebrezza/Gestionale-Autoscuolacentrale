const nodemailer = require('nodemailer');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const sendEmail = async (email, subject, text, attachment = null) => {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.GMAIL_SECRET
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
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
            }else{
                mailOptions.attachments = {path: attachment};
            }
        }
        transporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                reject(new Error('Errore nell\'invio dell\'email:'));
            } else {
                resolve(`email inviata con successo a ${email}`);
            }
        });
    });
}

const sendRinnoviEmail = async (email, subject, text, attachment = null) => {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.GMAIL_SECRET
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        const numero_patente = 'AA120AA', data_scadenza = '25/07/2025', nomeECognome = 'Gabriele Brezza'
        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: subject,
            text: text,
            html: `
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
            color: #e95e28;
        }
        p {
            color: #333333;
        }
        a {
            color: #4a80c0;
            text-decoration: none;
        }
        .btn {
            background-color: #e95e28;
            color: #ffffff;
            padding: 10px 20px;
            border-radius: 5px;
            text-align: center;
            display: inline-block;
            text-decoration: none;
        }
        .logo {
            display: block;
            margin: 0 auto 20px;
            width: 200px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <img src="https://iscrizione-autoscuolacentrale.com/img/logo_rinnovopatenti.png" alt="Logo Rinnovopatenti" class="logo">
        <h1>La tua patente sta per scadere! Rinnovala con rinnovopatenti.it</h1>
        <p>Gentile ${nomeECognome},</p>
        <p>oltre a ringraziarti nuovamente per aver già usato il nostro servizio per rinnovare la tua patente, ti ricordiamo che la tua patente N. <strong>${numero_patente}</strong> scadrà il <strong>${data_scadenza}</strong>.</p>
        <p>Ci permettiamo di ricordarti come prenotare con pochi e semplici click:</p>
        <ul>
            <li>Vai sul nostro sito: <a href="https://www.rinnovopatenti.it">Rinnovopatenti.it</a></li>
            <li>Scegli la tua città: non importa dove risiedi, puoi rinnovare la patente in qualsiasi città d'Italia.</li>
            <li>Trova lo studio e la data perfetti per te: in pochi istanti, visualizzerai tutte le opzioni disponibili.</li>
            <li>Prenota la tua visita: compila il modulo online.</li>
            <li>Se desideri ridurre al minimo il tempo di attesa in studio, allega foto e firma al termine della prenotazione, oppure dopo aver prenotato attraverso l’area utenti.</li>
        </ul>
        <p><strong>E dopo la visita?</strong></p>
        <p>La tua nuova patente ti verrà recapitata direttamente all'indirizzo che preferisci, indipendentemente dalla residenza, senza ulteriori pensieri.</p>
        <p><strong>Non perdere tempo prezioso!</strong></p>
        <p>Clicca qui per prenotare subito il rinnovo della tua patente: <a href="https://www.rinnovopatenti.it" class="btn" style="color: #fff">Rinnova la tua patente ora!</a></p>
        <p>La tua sicurezza e la tua tranquillità sono la nostra priorità.</p>
        <p>Ti aspettiamo!</p>
        <p>Team Rinnovopatenti.it</p>
    </div>
</body>
</html>

            `
        };
        
        transporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                reject(new Error('Errore nell\'invio dell\'email:'));
            } else {
                resolve(`email inviata con successo a ${email}`);
            }
        });
        
    });
}

module.exports = {sendEmail, sendRinnoviEmail};