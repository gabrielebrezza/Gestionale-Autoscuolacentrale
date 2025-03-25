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
        required: true,
        uppercase: true,
        dropDups: true,
        unique: true
    },
    spedizione: {
        via: {
            type: String,
            required: false
        },
        nCivico: {
            type: String,
            required: false
        },
        cap: {
            type: String,
            required: false
        },
        comune: {
            type: String,
            required: false
        },
        provincia: {
            type: String,
            required: false
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