const mongoose = require('mongoose');


const RinnoviSchema = new mongoose.Schema({
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
    visita: {
        data: {
            type: Date,
            required: false
        },
        ora: {
            type: String,
            required: false
        }
    },
    nPatente: {
        type: String,
        required: true
    },
    protocollo: {
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
        emessa:{
            type: Boolean,
            required: false
        },
        numero: {
            type: Number,
            required: false
        }
    },
    creationDate: {
        type: Date,
        required: false
    },
    note: {
        type: String,
        required: false
    },
    hasPhoto: {
        type: Boolean,
        required: false,
        default: false
    },
    hasSign: {
        type: Boolean,
        required: false,
        default: false
    },
    archiviato: {
        type: Boolean,
        required: false
    }
});
const Rinnovi = new mongoose.model('Rinnovi', RinnoviSchema);

module.exports = Rinnovi; 