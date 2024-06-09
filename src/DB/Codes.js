const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Codes Database connected successfully');
})
.catch(() =>{
    console.log('Codes Database cannot be connected ');
});

const CodeSchema = new mongoose.Schema({
    cFiscale: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    }
});
const Codes = new mongoose.model('Codes', CodeSchema);

module.exports = Codes; 