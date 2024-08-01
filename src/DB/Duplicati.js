const mongoose = require('mongoose');


const DuplicatiSchema = new mongoose.Schema({
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
    sesso: {
        type: String,
        required: true
    },
    nascita: {
        nazione: {
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
        data: {
            type: String,
            required: true
        }
    },
    nazionalita: {
        type: String,
        required: true
    },
    residenza: {
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
    contatti: {
        email: {
            type: String,
            required: true
        },
        tel: {
            type: String,
            required: true
        }
    },
    nPatente: {
        type: String,
        required: true
    },
    motivo: {
        type: String,
        required: false
    },
    accontoPagato: {
        type: Number,
        required: false
    },
    metodoPagamentoAcconto: {
        type: String,
        required: false
    },
    saldoPagato: {
        type: Number,
        required: false
    },
    metodoPagamentoSaldo: {
        type: String,
        required: false
    },
    tipoDocumento: {
        type: String,
        required: false
    },
    nDocumento: {
        type: String,
        required: false
    },
    note: {
        type: String,
        required: false
    }
});
const Duplicati = new mongoose.model('Duplicati', DuplicatiSchema);

module.exports = Duplicati; 