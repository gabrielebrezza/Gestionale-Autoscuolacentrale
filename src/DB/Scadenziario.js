const mongoose = require('mongoose');


const ScadenziarioSchema = new mongoose.Schema({
    // nome: {
    //     type: String,
    //     required: false
    // },
    // cognome: {
    //     type: String,
    //     required: false
    // },
    nomeECognome: {
        type: String,
        required: false
    },
    cf: {
        type: String,
        required: true,
        uppercase: true,
        dropDups: true,
        unique: true
    },
    residenza: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    // spedizione: {
    //     via: {
    //         type: String,
    //         required: false
    //     },
    //     nCivico: {
    //         type: String,
    //         required: false
    //     },
    //     cap: {
    //         type: String,
    //         required: false
    //     },
    //     comune: {
    //         type: String,
    //         required: false
    //     },
    //     provincia: {
    //         type: String,
    //         required: false
    //     }
    // },
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