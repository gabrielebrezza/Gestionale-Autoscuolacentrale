const mongoose = require('mongoose');
const connect = mongoose.connect(process.env.MONGODB_CONNECTION_URL);

connect.then(() =>{
    console.log('Rinnovi Database connected successfully');
})
.catch(() =>{
    console.log('Rinnovi Database cannot be connected ');
});

const RinnoviSchema = new mongoose.Schema({

});
const Rinnovi = new mongoose.model('Rinnovi', RinnoviSchema);

module.exports = Rinnovi; 