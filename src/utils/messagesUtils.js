const client = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

async function sendMessage(phoneNumbers, content){
    let errorNumbers = [];
    
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
    let results = await Promise.allSettled(sendPromises);

    return {
        results,
        errorNumbers
    };
}

module.exports = sendMessage;