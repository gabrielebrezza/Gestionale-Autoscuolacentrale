const mongoose = require('mongoose');


const ClientiSchema = new mongoose.Schema({
    cDestinatario: {
        type: String,
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    cognome: {
        type: String,
        required: true
    },
    cFiscale: {
        type: String,
        required: true
    },
    pIva: {
        type: String,
        required: true
    },
    idPaese: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    residenza : {
        indirizzo: {
            type: String,
            required: true
        },
        cap: {
            type: String,
            required: true
        },
        comune: {
            type: String,
            required: true
        },
        provincia: {
            type: String,
            required: true
        },
        nazione: {
            type: String,
            required: true
        }
    }
});
const ClientiGenerici = new mongoose.model('Clienti', ClientiSchema);

module.exports = ClientiGenerici; 