const mongoose = require('mongoose');
const agendaDB = mongoose.createConnection('mongodb+srv://antoniodamelio:nOm8iKw7hfJcWFhD@cluster0.oyegnnb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

agendaDB.on('connected', () => {
    console.log('storicoFattureAgenda database connected successfully');
  });
   
  agendaDB.on('error', (err) => {
    console.error('storicoFattureAgenda database connection error:', err);
  });

const storicoFattureSchema = new mongoose.Schema({
    numero: {
        type: Number,
        required: true
    },
    data: {
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    },
    user: {
        type: String,
        required: false
    },
    nomeFile: {
        type: String,
        required: true
    }
});

const storicoFattureAgenda = agendaDB.model('storicofattures', storicoFattureSchema);
  
module.exports = storicoFattureAgenda;