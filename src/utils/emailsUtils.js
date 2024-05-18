const nodemailer = require('nodemailer');
const tls = require('tls');

const sendEmail = async (email, subject, text) => {
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
    
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: subject,
            text: text
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
module.exports = sendEmail;