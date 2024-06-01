const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Admins Database connected successfully');
})
.catch(() =>{
    console.log('Admins Database cannot be connected ');
});

const AdminSchema = new mongoose.Schema({
    email: {
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
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        required: true
    }
});
const admins = new mongoose.model('admins', AdminSchema);

module.exports = admins;