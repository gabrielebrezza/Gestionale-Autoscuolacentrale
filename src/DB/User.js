const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_CONNECTION_URL)
.then(() =>{
    console.log('Main Database connected successfully');
})
.catch(() =>{
    console.log('Main Database cannot be connected ');
});

const UserSchema = new mongoose.Schema({
    cFiscale: {
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
    nascita: {
        comune: {
            type: String,
            required: false
        },
        provincia: {
            type: String,
            required: false
        },
        stato: {
            type: String,
            required: false
        },
        data: {
            type: String,
            required: true
        }
    },
    sesso: {
        type: String,
        required: true
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
        },
        stato: {
            type: String,
            required: false
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
    documento: {
        type: String,
        required: true
    },
    nDocumento: {
        type: String,
        required: true
    },
    patente: [
        {
            tipo:{
                type: String,
                required: true
            },
            pagato: {
                type: Boolean,
                required: true
            },
            bocciato: {
                type: Boolean,
                required: false,
                default: null
            }
        }
    ],
    visita: {
        type: String,
        required: false
    },
    teoria:[
        {
            data:{
                type: String,
                required: false,
                default: null
            },
            esito:{
                type: Boolean,
                required: false,
                default: null
            },
            assente:{
                type: Boolean,
                required: false,
            },
            emailSent:{
                type: Boolean,
                required: false,
            }
        }
    ],
    protocollo: {
        numero:{
            type: String,
            required: false
        },
        dataEmissione:{
            type: String,
            required: false
        },
    },
    numeroPatente:{
        type: String,
        required: false
    },
    dataRegistrazione:{
        type: String,
        required: true
    },
    fatture: [
        {
            data: {
                type: String,
                required: false
            },
            importo: {
                type: Number,
                required: false
            },
            paymentUrl: {
                type: String,
                required: false
            },
            emessa: {
                type: Boolean,
                required: false
            },
        }
    ],
    paymentId: {
        type: String,
        required: false
    },
    note: {
        type: String,
        required: false
    },
    archiviato:{
        type: Boolean,
        required: false
    }
});
const utenti = new mongoose.model('user', UserSchema);

module.exports = utenti;