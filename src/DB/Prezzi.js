const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Prezzi Database connected successfully');
})
.catch(() =>{
    console.log('Prezzi Database cannot be connected ');
});

const PrezziSchema = new mongoose.Schema({
    tipo:{
        type: String,
        required: true,
        unique: true
    },
    prezzoPrimaIscrizione: {
        type: Number,
        required: true
    },
    prezzoIscrizioniSuccessive: {
        type: Number, 
        required: true
    }
});
const prezzi = new mongoose.model('prezzi', PrezziSchema);

module.exports = prezzi;