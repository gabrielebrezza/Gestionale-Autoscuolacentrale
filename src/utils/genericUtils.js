const fsp = require('fs').promises;
async function trovaProvincia(cap) {
    try {
      const data = await fsp.readFile('./comuni.json', 'utf8');
      const comuni = JSON.parse(data);
      trimmedCap = cap.trim();
      const comune = comuni.find(item => item.cap.includes(cap.trim()));
      
      console.log(comune.sigla)
      return comune ? comune.sigla : ' ';
    } catch (error) {
      console.error('Errore nel caricamento del file:', error);
      return ' ';
    }
}

module.exports = {trovaProvincia};