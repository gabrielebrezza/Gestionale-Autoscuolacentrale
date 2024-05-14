const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Users Database connected successfully');
})
.catch(() =>{
    console.log('Users Database cannot be connected ');
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
    sesso: {
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
            }
        }
    ]
});
const utenti = new mongoose.model('user', UserSchema);

module.exports = utenti;