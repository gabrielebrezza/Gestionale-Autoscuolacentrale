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
        required: false
    },
    nascita: {
        nazione: {
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
        },
        data: {
            type: String,
            required: false
        }
    },
    nazionalita: {
        type: String,
        required: false
    },
    residenza: {
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
    contatti: {
        email: {
            type: String,
            required: false
        },
        tel: {
            type: String,
            required: false
        }
    },
    nPatente: {
        type: String,
        required: false
    },
    patenteRichiesta: {
        type: String,
        required: false
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
    },
    fatture: {
        data:{
            type: String,
            required: false
        },
        importo:{
            type: Number,
            required: false
        },
        fileCortesia: {
            type: String,
            required: false
        },
        emessa:{
            type: Boolean,
            required: false
        }
    },
    archiviato: {
        type: Boolean,
        required: false
    }
});
const Duplicati = new mongoose.model('Duplicati', DuplicatiSchema);

module.exports = Duplicati; 