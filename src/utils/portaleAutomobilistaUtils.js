const puppeteer = require('puppeteer');
const Credentials = require('../DB/Credentials');
const programmaScadenziario = require('../DB/programmaScadenziario');
const Scadenziario = require('../DB/Scadenziario');

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
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }), // Aspetta che la rete sia inattiva
          page.click('input[name="action:Login_executeLogin"]')
        ]);
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Inserisci il PIN
        await page.type('input[name="loginView.pin"]', credenziali.pin);

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:Pin_executePinValidation"]')
        ]);
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
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:ReadAcqRinnAgenzia_pagingAcqRinnAgenzia"]')
        ]);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Estrai i dati dai risultati
      const formData = await page.evaluate(() => {
        const data = {};
        try {
          data.cognome = document.getElementById('noTastoInvio_richiestaView_cognome').value;
          data.nome = document.getElementById('noTastoInvio_richiestaView_nome').value.replaceAll('’', "'");
          data.codiceFiscale = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_codiceFiscale').value;
          data.numeroPatente = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_thePatentePosseduta_numeroPatenteCompleto').value;
          data.provinciaResidenza = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_theProvincia_descrizione').value;
          data.comune = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_descrizioneComune').value.replaceAll('’', "'");
          data.toponimo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_toponimo').value;
          data.indirizzo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_indirizzo').value.replaceAll('’', "'");
          data.numeroCivico = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_numeroCivico').value;
          data.cap = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_cap').value;
        } catch (error) {
          console.error('Errore durante l\'estrazione dei dati:', error);
        }
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


  async function searchExpirationPortale(cf) {
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
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }), // Aspetta che la rete sia inattiva
            page.click('input[name="action:Login_executeLogin"]')
        ]);

        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Inserisci il PIN
        await page.type('input[name="loginView.pin"]', credenziali.pin);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:Pin_executePinValidation"]')
        ]);
        // Vai alla pagina di raccolta dati
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiestaCertificatoMedico/ReadAcqCertificatoPrimaFase_initAcqCertificatoPrimaFase.action');
        await new Promise(resolve => setTimeout(resolve, 4000));
        console.log(cf.toUpperCase().trim())
        await page.type('input[name="richiestaCertificatoMedicoView.richiestaCertificatoMedicoFrom.codFis"]', cf.toUpperCase().trim());
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:ReadAcqCertificatoPrimaFase_pagingAcqCertMedPrimaFase"]')
        ]);
        await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Estrai i dati dai risultati
        let dati = await page.evaluate(() => {
            let datiUtente = {};
            try {
                datiUtente.nome = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desNom').value;
                datiUtente.cognome = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desCog').value;
                datiUtente.numeroPatente = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_thePatente_numeroPatenteCompleto').value.trim();
                const selectedComune = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_theComuneResidenza_selectRowId');
                datiUtente.comune = selectedComune.options[selectedComune .selectedIndex].text.toLowerCase().trim() || '';
                datiUtente.toponimo = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codTpnIndRes').value.toLowerCase().trim() || '';
                datiUtente.indirizzo = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desIndRes').value.toLowerCase().trim() || '';
                datiUtente.numeroCivico = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codNumCvoIndRes').value.toLowerCase().trim() || '';
                datiUtente.cap = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codCapRes').value.toLowerCase().trim();
            } catch (error) {
                console.error('Errore durante l\'estrazione dei dati:', error);
            }
            return datiUtente;
        });
        console.log(dati)
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/permessoProvvisorioGuida/ReadAcqPermessoProvvisorio_initAcqPermessoProvvisorio.action');
        await new Promise(resolve => setTimeout(resolve, 4000));
        await page.type('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.numeroPatenteCompleto"]', dati.numeroPatente);
        await page.type('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.codiceFiscale"]', cf.toUpperCase());
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:ReadAcqPermessoProvvisorio_pagingAcqPermessoProvvisorio"]')
        ]);
        await new Promise(resolve => setTimeout(resolve, 5000));
      
        // Estrai i dati dai risultati
          const exp = await page.evaluate(() => {
              let exp;
              try {
                exp = document.getElementById('noTastoInvio_permessoProvvisorioGuidaView_permessoProvvisorioGuidaFrom_thePatente_dataScadenza').value;
              } catch (error) {
                  console.error('Errore durante l\'estrazione dei dati:', error);
              }
              return exp;
          });
          dati.expPatente = exp
          return dati;
    } catch (error) {
      console.error('Errore durante l\'operazione Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  


  async function searchScheduleExpirationPortale() {
    const users = await programmaScadenziario.find().limit(500);
    if(users.length == 0) return 0;
    let browser, totalErrors = 0;
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
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }), // Aspetta che la rete sia inattiva
            page.click('input[name="action:Login_executeLogin"]')
        ]);

        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Inserisci il PIN
        await page.type('input[name="loginView.pin"]', credenziali.pin);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('input[name="action:Pin_executePinValidation"]')
        ]);
        // Vai alla pagina di raccolta dati
        for(const u of users) {
          await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiestaCertificatoMedico/ReadAcqCertificatoPrimaFase_initAcqCertificatoPrimaFase.action');
          await new Promise(resolve => setTimeout(resolve, 4000));
          console.log(u.cf.toUpperCase().trim())
          await page.type('input[name="richiestaCertificatoMedicoView.richiestaCertificatoMedicoFrom.codFis"]', u.cf.toUpperCase().trim());
          
          await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              page.click('input[name="action:ReadAcqCertificatoPrimaFase_pagingAcqCertMedPrimaFase"]')
          ]);
          await new Promise(resolve => setTimeout(resolve, 5000));
        
          let numeroPatente = await page.evaluate( async () => {
            try {
              return document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_thePatente_numeroPatenteCompleto').value.trim();
            } catch (error) {
              console.error('Errore durante l\'estrazione del numero della patente:', error);
              return null;
            }

          });
          if(!numeroPatente){
            const utente = await programmaScadenziario.findOne({"_id": u._id});
            if(utente.try > 2){
              await programmaScadenziario.deleteOne({"_id": u._id});
              totalErrors++;
            }else{
              await programmaScadenziario.findOneAndUpdate({"_id": u._id}, {$inc: {"try" : 1}});
            }
            continue;
          }
          console.log(numeroPatente)
          await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/permessoProvvisorioGuida/ReadAcqPermessoProvvisorio_initAcqPermessoProvvisorio.action');
          await new Promise(resolve => setTimeout(resolve, 4000));
          await page.type('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.numeroPatenteCompleto"]', numeroPatente);
          await page.type('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.codiceFiscale"]', u.cf.toUpperCase());

          await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle0' }),
              page.click('input[name="action:ReadAcqPermessoProvvisorio_pagingAcqPermessoProvvisorio"]')
          ]);
          await new Promise(resolve => setTimeout(resolve, 5000));
        
          // Estrai i dati dai risultati
          const exp = await page.evaluate( async () => {
              try {
                return document.getElementById('noTastoInvio_permessoProvvisorioGuidaView_permessoProvvisorioGuidaFrom_thePatente_dataScadenza').value;
              } catch (error) {
                  console.error('Errore durante l\'estrazione della scadenza della patente:', error);
                  return null;
              }
          });
          if(!exp){
            const utente = await programmaScadenziario.findOne({"_id": u._id});
            if(utente.try > 2){
              await programmaScadenziario.deleteOne({"_id": u._id});
              totalErrors++;
            }else{
              await programmaScadenziario.findOneAndUpdate({"_id": u._id}, {$inc: {"try" : 1}});
            }
            continue;
          }
          console.log(exp)
          if(exp && numeroPatente){
            try {
              const newUser = new Scadenziario({
                nomeECognome: u.nomeECognome,
                cf: u.cf,
                residenza: u.residenza,
                email: u.email,
                nPatente: numeroPatente,
                expPatente: new Date(exp.split('/').reverse().join('-'))
              });
              await newUser.save();
              await programmaScadenziario.deleteOne({"_id": u._id});
            } catch (error) {
              console.log(`Si è verificato un'errore nell'aggiunta dell'utente allo scadenziario: ${error}`);
              totalErrors++;
            }
          }
        }
        return totalErrors;
    } catch (error) {
      console.error('Errore durante l\'operazione Puppeteer:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

module.exports = {searchUserPortale, searchExpirationPortale, searchScheduleExpirationPortale};