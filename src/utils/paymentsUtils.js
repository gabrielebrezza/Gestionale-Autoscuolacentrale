const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const utenti = require('../DB/User');

//functions
const {sendEmail} = require('../utils/emailsUtils.js');
const {compilaTt2112, compilaCertResidenza} = require('../utils/compileUtils');

async function setPayment(userId, paymentUrl, patente, price, email) {
    try {
        await utenti.findOneAndUpdate(
          {
            "_id": userId,
            "patente": {
              $elemMatch: {
                "tipo": patente,
                "pagato": false
              }
            }
          },
          {
            $set: {
              "patente.$.pagato": true
            }
          }
        );
        const today = new Date();
        const DD = String(today.getDate()).padStart(2, '0'); 
        const MM = String(today.getMonth() + 1).padStart(2, '0'); 
        const YYYY = today.getFullYear(); 
        const dataFatturazione = `${DD}/${MM}/${YYYY}`;
        await utenti.findOneAndUpdate(
            {"_id": userId},
            {
                $addToSet: {
                    "fatture": {"data": dataFatturazione, "importo": price, "paymentUrl": paymentUrl, "emessa": false},
                }
            },
            {new: true}
        );
        try {
          await compilaTt2112(userId);
        }catch (error) {
          console.error(error.message);
        }
        try {
          await compilaCertResidenza(userId);
        }catch (error) {
          console.error(error.message);
        }
        const fileNames = [
          `certificati/tt2112/tt2112_${userId}.pdf`,
          `certificati/residenza/residenza_${userId}.pdf`
        ];
        try{
          const result = await sendEmail(email, 'Iscrizione effettuata con successo', `Grazie per esserti iscritto alla patente ${patente}. Ti chiediamo gentilmente in caso tu non l'avessi ancora fatto di inviarci la scansione della tua firma e della fototessera che apparirà sulla patente`, fileNames );
          console.log(result);
        }catch (error){
          console.error('Errore durante l\'invio dell\'email:', error);
        }
        console.log(`l'utente ${userId} ha completato il pagamento con successo per la patente ${patente}`);
    } catch (error) {
        console.error('Errore durante il recupero dei dati dell\'utente:', error);
    }
}


function generateDigest(body) {
    const hash = crypto.createHash('sha256');
    hash.update(body);
    return `SHA-256=${hash.digest('base64')}`;
}

function signString(stringToSign) {
    const privateKey = fs.readFileSync('src/keys/satispay/private.pem', 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign);
    return signer.sign(privateKey, 'base64');
}

async function createSatispayPayment(prezzo, id, patente, email) {
    const payload = {
        flow: 'MATCH_CODE',
        amount_unit: prezzo * 100,
        currency: 'EUR',
        callback_url: `${process.env.SERVER_URL}/satispay-callback?payment_id={uuid}`,
        redirect_url: `${process.env.SERVER_URL}/satispay/successPayment?id=${id}`,
        metadata: {
            id: id,
            patente: patente,
            email: email
        }
    };

    const body = JSON.stringify(payload);
    const date = new Date().toUTCString();
    const requestTarget = `(request-target): post /g_business/v1/payments`;
    const host = `host: ${process.env.SATISPAY_API_URL}`;
    const digest = generateDigest(body);

    const stringToSign = `${requestTarget}\n${host}\ndate: ${date}\ndigest: ${digest}`;

    const signature = signString(stringToSign);

    const authorizationHeader = `Signature keyId="${process.env.SATISPAY_KEYID}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

    try {
        const response = await axios.post(`https://${process.env.SATISPAY_API_URL}/g_business/v1/payments`, body, {
            headers: {
                'Content-Type': 'application/json',
                'Host': process.env.SATISPAY_API_URL,
                'Date': date,
                'Digest': digest,
                'Authorization': authorizationHeader
            }
        });
        const { redirect_url } = response.data;
        const payment_id = response.data.id;
        return { payment_id, redirect_url };
    } catch (error) {
        console.error('Error creating payment:', error.response ? error.response.data : error.message);
    }
}

async function checkPaymentStatus(paymentId) {
  const url = `https://${process.env.SATISPAY_API_URL}/g_business/v1/payments/${paymentId}`;
  const date = new Date().toUTCString();
  const requestTarget = `(request-target): get /g_business/v1/payments/${paymentId}`;
  const host = `host: ${process.env.SATISPAY_API_URL}`;
  
  // Corpo della richiesta vuoto per GET
  const body = '';
  const digest = generateDigest(body);
  
  const stringToSign = `${requestTarget}\n${host}\ndate: ${date}\ndigest: ${digest}`;
  const signature = signString(stringToSign);
  
  const authorizationHeader = `Signature keyId="${process.env.SATISPAY_KEYID}", algorithm="rsa-sha256", headers="(request-target) host date digest", signature="${signature}"`;

  try {
      const response = await axios.get(url, {
          headers: {
              'Content-Type': 'application/json',
              'Host': process.env.SATISPAY_API_URL,
              'Date': date,
              'Digest': digest,
              'Authorization': authorizationHeader
          }
      });
      const { status, metadata, amount_unit } = response.data;
      return { status, metadata, amount_unit }; 
  } catch (error) {
      console.error('Error checking payment status:', error.response ? error.response.data : error.message);
      throw error;
  }
}

module.exports = {setPayment, createSatispayPayment, checkPaymentStatus};