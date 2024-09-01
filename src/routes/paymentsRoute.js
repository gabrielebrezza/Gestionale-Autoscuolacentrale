const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const paypal = require('paypal-rest-sdk');
const crypto = require('crypto');
const axios = require('axios');

const utenti = require('./../DB/User');

//functions
const setPayment = require('../utils/paymentsUtils.js');
const router = express.Router();

router.post('/stripeHooks', express.raw({type: 'application/json'}), async (req, res) =>{
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
  
    let event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_SIGNING_SECRET);
      } catch (error) {
        console.log(error.message);
        return res.status(400).json({success: false});
    }
  
    if(event.type == 'checkout.session.completed') {
        const session = event.data.object;
        const price = session.amount_total/100;
        const {id, patente, email} = session.metadata;
        await setPayment(id, patente, price, email);
    }
    res.json({success: true});
  })
  
  router.get('/successPayment/paypal', async (req, res) => {
  
      const payerId = req.query.PayerID;
      const paymentId = req.query.paymentId; 
      const price = req.query.price;
      if(!paymentId || !payerId){
        return res.render('errorPage' ,{error: 'non hai effettuato nessun pagamento'});
      }
      const execute_payment_json = {
          payer_id: payerId,
          transactions: [
              {
                  amount: {
                      currency: "EUR",
                      total: price
                  }
              }
          ]
      };
  
      paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
          if(error){
              console.error(error.response);
              throw error
          }else{
            try{
              const {id, patente, email} = JSON.parse(payment.transactions[0].custom);
              await setPayment(id, patente, price, email);
              return res.redirect(`/successPayment?id=${encodeURIComponent(id)}`);
            }catch(error){
              return res.status(500).json({error: error.message});
            }
          }
    });
  });




  router.post('/satispay-callback', async (req, res) => {
    const paymentId = req.body.payment_id;

    if (!paymentId) {
        return res.status(400).send('Payment ID non fornito');
    }

    console.log(`Ricevuto callback per pagamento con ID: ${paymentId}`);

    // Recupera lo stato aggiornato del pagamento
    const paymentData = await getPaymentStatus(paymentId);

    if (!paymentData) {
        return res.status(500).send('Impossibile recuperare lo stato del pagamento');
    }

    const status = paymentData.status;


    if (status.toLowerCase() === 'success') {
        await updatePaymentStatus(paymentData.metadata.id, paymentData.metadata.patente, paymentData.amount_unit / 100, paymentData.metadata.email);
    }else{
      res.status(401).send('Pagamento non effettuato');
    }

    console.log(`Stato del pagamento aggiornato: ${status}`);
    res.status(200).send('Callback ricevuta con successo');
});



async function getPaymentStatus(paymentId) {
  const date = new Date().toUTCString();
  const requestTarget = `(request-target): get /g_business/v1/payments/${paymentId}`;
  const host = 'host: authservices.satispay.com';
  
  // Non c'è un body per una richiesta GET, quindi il digest sarà vuoto
  const stringToSign = `${requestTarget}\n${host}\ndate: ${date}`;
  const signature = signString(stringToSign);

  const authorizationHeader = `Signature keyId="${publicKeyId}", algorithm="rsa-sha256", headers="(request-target) host date", signature="${signature}"`;

  try {
      const response = await axios.get(`${apiUrl}/${paymentId}`, {
          headers: {
              'Host': 'authservices.satispay.com',
              'Date': date,
              'Authorization': authorizationHeader
          }
      });
      return response.data;
  } catch (error) {
      console.error('Error fetching payment status:', error.response ? error.response.data : error.message);
  }
}

router.get('/satispay/successPayment', async (req, res) =>{
  const {id, pat} = req.query.id;
  const utente = await utenti.findOne({
    _id: id,
    patente: {
      $elemMatch: {
        tipo: pat,
        pagato: true
      }
    }
  });
  if(utente){
    return res.redirect(`/successPayment?id=${id}`);
  }else{
    return res.redirect('/cancelPayment');
  }
});
  router.get('/successPayment', async (req, res) =>{ res.render('payments/paymentSuccess', {text: 'Grazie per esserti iscritto da noi!!', id: req.query.id})});
  router.get('/cancelPayment', async (req, res) => res.render('payments/cancelPayment', {text: 'Ci spiace che tu abbia deciso di non iscriverti da noi.'}));

module.exports = router;