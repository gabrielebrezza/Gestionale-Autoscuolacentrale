const jwt = require('jsonwebtoken'); 

const admins = require('../DB/Admin');

async function generateToken(email) {
    return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '3d' });
}

async function authenticateJWT(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(403).redirect('/admin/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return res.redirect('/admin/login');
        }
        
        try {
            const email = user.email; 
            const approvedAdmin = await admins.findOne({ "email": email, "approved": true });
            
            if (!approvedAdmin) {
                return res.redirect(`/waitingApprovation?email=${email}`);
            }
            const ispathEnabled = req.path != '/admin/rinnovi/scadenziario/deleteUsers' && req.path != '/admin/rinnovi/ricerca/scadenzaPatente' && req.path != '/admin/rinnovi/scadenziario';
            if (ispathEnabled && approvedAdmin.role == 'worker') {
                return res.redirect('/admin/rinnovi/scadenziario');
            }
        } catch (error) {
            console.error('Errore durante il recupero dello stato di approvazione dell\'utente:', error);
            return res.render('errorPage', { error: 'Errore durante il recupero dello stato di approvazione dell\'utente' });
        }
        
        req.user = user;
        next();
    });
}

module.exports = { generateToken, authenticateJWT };