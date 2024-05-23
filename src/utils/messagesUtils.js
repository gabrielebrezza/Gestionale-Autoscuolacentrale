const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

async function sendMessage(phoneNumbers, content){
    let errorNumbers = [];
    
    // Mappiamo i numeri di telefono su un array di promesse
    let sendPromises = phoneNumbers.map(number => {
        return client.messages
            .create({
                body: content,
                from: '+12182748160',
                to: `+39${number}`
            })
            .then((message) => {
                return { number, success: true };
            })
            .catch((error) => {
                errorNumbers.push(number);
                return { number, success: false };
            });
    });

    // Attendi il completamento di tutte le promesse
    let results = await Promise.allSettled(sendPromises);

    // Risolvi la promessa con i risultati e i numeri con errori
    return {
        results,
        errorNumbers
    };
}

module.exports = sendMessage;