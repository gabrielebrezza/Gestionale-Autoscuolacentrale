const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Cassa Database connected successfully');
})
.catch(() =>{
    console.log('Cassa Database cannot be connected ');
});

const CassaSchema = new mongoose.Schema({
    causa: {
        type: String,
        required: true
    },
    data:{
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    }
});
const Cassa = new mongoose.model('Cassa', CassaSchema);

module.exports = Cassa; 