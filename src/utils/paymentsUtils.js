const utenti = require('../DB/User');

//functions
const sendEmail = require('../utils/emailsUtils.js');
const {compilaTt2112, compilaCertResidenza} = require('../utils/compileUtils');

async function setPayment(cFiscale, patente, price, email) {
    try {
        await utenti.findOneAndUpdate(
          {
            "cFiscale": cFiscale,
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
            {"cFiscale": cFiscale},
            {
                $addToSet: {
                    "fatture": {"data": dataFatturazione, "importo": price, "emessa": false},
                }
            },
            {new: true}
        );
        try {
          await compilaTt2112(cFiscale);
        }catch (error) {
          console.error(error.message);
        }
        try {
          await compilaCertResidenza(cFiscale);
        }catch (error) {
          console.error(error.message);
        }
        const fileNames = [
          `certificati/tt2112/tt2112_${cFiscale}.pdf`,
          `certificati/residenza/residenza_${cFiscale}.pdf`
        ];
        try{
          const result = await sendEmail(email, 'Iscrizione effettuata con successo', `Grazie per esserti iscritto alla patente ${patente}. Ti chiediamo gentilmente in caso tu non l'avessi ancora fatto di inviarci la scansione della tua firma e della fototessera che apparirà sulla patente`, fileNames );
          console.log(result);
        }catch (error){
          console.error('Errore durante l\'invio dell\'email:', error);
        }
        console.log(`l'utente con codice fiscale ${cFiscale} ha completato il pagamento con successo per la patente ${patente}`);
    } catch (error) {
        console.error('Errore durante il recupero dei dati dell\'utente:', error);
        return res.status(500).json({ message: 'Errore del server' });
    }
}

module.exports = setPayment;