const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Rinnovi Database connected successfully');
})
.catch(() =>{
    console.log('Rinnovi Database cannot be connected ');
});

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
            required: true
        },
        tel: {
            type: String,
            required: true
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
            type: String,
            required: true
        },
        ora: {
            type: String,
            required: true
        }
    },
    nPatente: {
        type: String,
        required: true
    },
    protocollo: {
        type: String,
        required: true
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
    },
    note: {
        type: String,
        required: false
    },
    archiviato: {
        type: Boolean,
        required: false
    }
});
const Rinnovi = new mongoose.model('Rinnovi', RinnoviSchema);

module.exports = Rinnovi; 