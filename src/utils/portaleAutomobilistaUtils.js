const puppeteer = require('puppeteer');
const Credentials = require('../DB/Credentials');

async function searchUserPortale(cf, cognome, nPatente) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const credenziali = await Credentials.findOne();
        const page = await browser.newPage();
        await page.goto('https://www.ilportaledellautomobilista.it/web/portale-automobilista/loginspid');
        await page.waitForSelector('.formSso2');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.type('input[name="loginView.beanUtente.userName"]', credenziali.user);
        await page.type('input[name="loginView.beanUtente.password"]', credenziali.password);
        await page.click('input[name="action:Login_executeLogin"]');
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Inserisci il PIN
        await page.type('input[name="loginView.pin"]', credenziali.pin);
        await page.click('input[name="action:Pin_executePinValidation"]');
        // Vai alla pagina di raccolta dati
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiesta/ReadAcqRinnAgenzia_initAcqRinnAgenzia.action');
        await new Promise(resolve => setTimeout(resolve, 4000));
        if( nPatente && cognome ){
            await page.type('input[name="richiestaView.richiestaRinnAgenziaFrom.patente"]', nPatente.toUpperCase());
            await page.type('input[name="richiestaView.cognome"]', cognome.toUpperCase());
        }else if(nPatente && cf){
            await page.type('input[name="richiestaView.richiestaRinnAgenziaFrom.patente"]', nPatente.toUpperCase());
            await page.type('input[name="richiestaView.richiestaRinnAgenziaFrom.theAnagrafica.codiceFiscale"]', cf.toUpperCase());
        }
      await page.click('input[name="action:ReadAcqRinnAgenzia_pagingAcqRinnAgenzia"]');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Estrai i dati dai risultati
      const formData = await page.evaluate(() => {
        const data = {};
        try {
          data.cognome = document.getElementById('noTastoInvio_richiestaView_cognome').value;
          data.nome = document.getElementById('noTastoInvio_richiestaView_nome').value;
          data.codiceFiscale = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_codiceFiscale').value;
          data.numeroPatente = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_thePatentePosseduta_numeroPatenteCompleto').value;
          data.provinciaResidenza = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_theProvincia_descrizione').value;
          data.comune = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_descrizioneComune').value;
          data.toponimo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_toponimo').value;
          data.indirizzo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_indirizzo').value;
          data.numeroCivico = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_numeroCivico').value;
          data.cap = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_cap').value;
        } catch (error) {
          console.error('Errore durante l\'estrazione dei dati:', error);
        }
        console.log(data)
        return data;
      });
      return formData;
      
    } catch (error) {
      console.error('Errore durante l\'operazione Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }



  




module.exports = {searchUserPortale, searchExpirationPortale};