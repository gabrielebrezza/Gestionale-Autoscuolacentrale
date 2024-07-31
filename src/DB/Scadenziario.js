const mongoose = require('mongoose');


const ScadenziarioSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    cognome: {
        type: String,
        required: true
    }, 
    cf: {
        type: String,
        required: true
    },
    spedizione: {
        via: {
            type: String,
            required: true
        },
        nCivico: {
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
        }
    },
    nPatente: {
        type: String,
        required: true
    },
    expPatente: {
        type: String,
        required: false
    },
    note: {
        type: String,
        required: false
    }
});
const Scadenziario = new mongoose.model('Scadenziario', ScadenziarioSchema);

module.exports = Scadenziario; 