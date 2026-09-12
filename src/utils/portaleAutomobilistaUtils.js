const { chromium } = require('playwright');
const Credentials = require('../DB/Credentials');
const programmaScadenziario = require('../DB/programmaScadenziario');
const Scadenziario = require('../DB/Scadenziario');

// Argomenti standard ottimizzati per ambienti server/Linux
const browserArgs = [
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--no-zygote'
];

async function searchUserPortale(cf, cognome, nPatente) {
    let browser, context, page;
    try {
        browser = await chromium.launch({ headless: true, args: browserArgs });
        const credenziali = await Credentials.findOne();
        
        context = await browser.newContext();
        page = await context.newPage();
        
        await page.goto('https://www.ilportaledellautomobilista.it/web/portale-automobilista/loginspid');
        
        await page.fill('input[name="loginView.beanUtente.userName"]', credenziali.user);
        await page.fill('input[name="loginView.beanUtente.password"]', credenziali.password);
        
        await page.click('input[name="action:Login_executeLogin"]');
        await page.waitForLoadState('networkidle');

        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        
        await page.fill('input[name="loginView.pin"]', credenziali.pin);
        await page.click('input[name="action:Pin_executePinValidation"]');
        await page.waitForLoadState('networkidle');

        // Vai alla pagina di raccolta dati
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiesta/ReadAcqRinnAgenzia_initAcqRinnAgenzia.action');
        
        await page.waitForTimeout(2000); 

        if (nPatente && cognome) {
            await page.fill('input[name="richiestaView.richiestaRinnAgenziaFrom.patente"]', nPatente.toUpperCase());
            await page.fill('input[name="richiestaView.cognome"]', cognome.toUpperCase());
        } else if (nPatente && cf) {
            await page.fill('input[name="richiestaView.richiestaRinnAgenziaFrom.patente"]', nPatente.toUpperCase());
            await page.fill('input[name="richiestaView.richiestaRinnAgenziaFrom.theAnagrafica.codiceFiscale"]', cf.toUpperCase());
        }

        await page.click('input[name="action:ReadAcqRinnAgenzia_pagingAcqRinnAgenzia"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); 
      
        // Estrai i dati dai risultati
        const formData = await page.evaluate(() => {
            const data = {};
            try {
                data.cognome = document.getElementById('noTastoInvio_richiestaView_cognome')?.value || '';
                data.nome = document.getElementById('noTastoInvio_richiestaView_nome')?.value.replaceAll('’', "'") || '';
                data.codiceFiscale = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_codiceFiscale')?.value || '';
                data.numeroPatente = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_thePatentePosseduta_numeroPatenteCompleto')?.value || '';
                data.provinciaResidenza = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_theProvincia_descrizione')?.value || '';
                data.comune = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_theComune_descrizioneComune')?.value.replaceAll('’', "'") || '';
                data.toponimo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_toponimo')?.value || '';
                data.indirizzo = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_indirizzo')?.value.replaceAll('’', "'") || '';
                data.numeroCivico = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_numeroCivico')?.value || '';
                data.cap = document.getElementById('noTastoInvio_richiestaView_richiestaRinnAgenziaFrom_theAnagrafica_cap')?.value || '';
            } catch (error) {
                console.error('Errore durante l\'estrazione dei dati:', error);
            }
            return data;
        });

        return formData;
      
    } catch (error) {
        console.error('Errore durante l\'operazione Playwright:', error);
        throw error;
    } finally {
        if (page && !page.isClosed()) await page.close().catch(()=>{});
        if (context) await context.close().catch(()=>{});
        if (browser) await browser.close().catch(()=>{});
    }
}


async function searchExpirationPortale(cf) {
    let browser, context, page;
    try {
        browser = await chromium.launch({ headless: true, args: browserArgs });
        const credenziali = await Credentials.findOne();
        
        context = await browser.newContext();
        page = await context.newPage();
        
        // --- LOGIN ---
        await page.goto('https://www.ilportaledellautomobilista.it/web/portale-automobilista/loginspid');
        
        await page.fill('input[name="loginView.beanUtente.userName"]', credenziali.user);
        await page.fill('input[name="loginView.beanUtente.password"]', credenziali.password);
        await page.click('input[name="action:Login_executeLogin"]');
        await page.waitForLoadState('networkidle');

        // --- PIN ---
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await page.fill('input[name="loginView.pin"]', credenziali.pin);
        await page.click('input[name="action:Pin_executePinValidation"]');
        await page.waitForLoadState('networkidle');

        // --- FASE 1: Dati ---
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiestaCertificatoMedico/ReadAcqCertificatoPrimaFase_initAcqCertificatoPrimaFase.action');
        await page.waitForTimeout(2000);
        
        console.log("Ricerca CF:", cf.toUpperCase().trim());
        await page.fill('input[name="richiestaCertificatoMedicoView.richiestaCertificatoMedicoFrom.codFis"]', cf.toUpperCase().trim());
        
        await page.click('input[name="action:ReadAcqCertificatoPrimaFase_pagingAcqCertMedPrimaFase"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      
        let dati = await page.evaluate(() => {
            let datiUtente = {};
            try {
                datiUtente.nome = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desNom')?.value || '';
                datiUtente.cognome = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desCog')?.value || '';
                datiUtente.numeroPatente = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_thePatente_numeroPatenteCompleto')?.value.trim() || '';
                
                const selectedComune = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_theComuneResidenza_selectRowId');
                datiUtente.comune = (selectedComune && selectedComune.selectedIndex >= 0) 
                    ? selectedComune.options[selectedComune.selectedIndex].text.toLowerCase().trim() 
                    : '';
                
                datiUtente.toponimo = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codTpnIndRes')?.value.toLowerCase().trim() || '';
                datiUtente.indirizzo = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_desIndRes')?.value.toLowerCase().trim() || '';
                datiUtente.numeroCivico = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codNumCvoIndRes')?.value.toLowerCase().trim() || '';
                datiUtente.cap = document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_codCapRes')?.value.toLowerCase().trim() || '';
            } catch (error) {
                console.error('Errore estrazione dati DOM:', error);
            }
            return datiUtente;
        });

        console.log(dati);

        if (!dati.numeroPatente) {
            dati.expPatente = null;
            return dati;
        }

        // --- FASE 2: Scadenza ---
        await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/permessoProvvisorioGuida/ReadAcqPermessoProvvisorio_initAcqPermessoProvvisorio.action');
        await page.waitForTimeout(2000);
        
        await page.fill('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.numeroPatenteCompleto"]', dati.numeroPatente);
        await page.fill('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.codiceFiscale"]', cf.toUpperCase());
        
        await page.click('input[name="action:ReadAcqPermessoProvvisorio_pagingAcqPermessoProvvisorio"]');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      
        const exp = await page.evaluate(() => {
            try {
                return document.getElementById('noTastoInvio_permessoProvvisorioGuidaView_permessoProvvisorioGuidaFrom_thePatente_dataScadenza')?.value || null;
            } catch (error) {
                return null;
            }
        });
        dati.expPatente = exp;
        
        return dati;
        
    } catch (error) {
        console.error('Errore durante l\'operazione Playwright:', error);
        throw error;
    } finally {
        if (page && !page.isClosed()) await page.close().catch(()=>{});
        if (context) await context.close().catch(()=>{});
        if (browser) await browser.close().catch(()=>{});
    }
}


function logMemoryUsage(step = '') {
    const memoryUsage = process.memoryUsage();
    console.log(`--- RAM USAGE ${step} ---`);
    console.log(`🧠 RSS        : ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Heap Total : ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Heap Used  : ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔧 External   : ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`);
    console.log('------------------------\n');
}


async function searchScheduleExpirationPortale() {
    let users = await programmaScadenziario.aggregate([
        {
            $match: {
                $or: [
                    { try: { $exists: false } },
                    { try: 0 }
                ]
            }
        },
        { $sample: { size: 500 } }
    ]);
    
    if (users.length === 0) {
        users = await programmaScadenziario.aggregate([
            { $sample: { size: 900 } }
        ]);
    }
    
    if (users.length == 0) return { totalErrors: 0 }; 

    let browser, context, totalErrors = 0;
    try {
        browser = await chromium.launch({ headless: true, args: browserArgs });
        const credenziali = await Credentials.findOne();

        // INIZIALIZZA IL CONTEXT
        context = await browser.newContext();

        // 1. Facciamo il LOGIN una volta sola
        let loginPage = await context.newPage();
        await loginPage.goto('https://www.ilportaledellautomobilista.it/web/portale-automobilista/loginspid');
        
        await loginPage.fill('input[name="loginView.beanUtente.userName"]', credenziali.user);
        await loginPage.fill('input[name="loginView.beanUtente.password"]', credenziali.password);
        await loginPage.click('input[name="action:Login_executeLogin"]');
        await loginPage.waitForLoadState('networkidle');
        
        await loginPage.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/index.jsp');
        await loginPage.fill('input[name="loginView.pin"]', credenziali.pin);
        await loginPage.click('input[name="action:Pin_executePinValidation"]');
        await loginPage.waitForLoadState('networkidle');

        await loginPage.close(); 
        
        // 2. Ciclo sugli utenti
        let userIndex = 0;
        for (const u of users) {
            userIndex++;
            console.log(`\n--- Elaborazione utente ${userIndex}/${users.length} ---`);
            
            let page; 
            try {
                page = await context.newPage(); 
                
                await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/richiestaCertificatoMedico/ReadAcqCertificatoPrimaFase_initAcqCertificatoPrimaFase.action');
                await page.waitForTimeout(2000);
                
                console.log(u.cf.toUpperCase().trim());
                await page.fill('input[name="richiestaCertificatoMedicoView.richiestaCertificatoMedicoFrom.codFis"]', u.cf.toUpperCase().trim());
                
                await page.click('input[name="action:ReadAcqCertificatoPrimaFase_pagingAcqCertMedPrimaFase"]');
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
            
                let numeroPatente = await page.evaluate(() => {
                    return document.getElementById('noTastoInvio_richiestaCertificatoMedicoView_richiestaCertificatoMedicoFrom_thePatente_numeroPatenteCompleto')?.value.trim() || null;
                });

                if (!numeroPatente) {
                    const utente = await programmaScadenziario.findOne({ "_id": u._id });
                    if (utente.try > 2) {
                        await programmaScadenziario.deleteOne({ "_id": u._id });
                        totalErrors++;
                    } else {
                        await programmaScadenziario.findOneAndUpdate({ "_id": u._id }, { $inc: { "try": 1 } });
                    }
                    continue; 
                }

                console.log("Patente:", numeroPatente);

                await page.goto('https://www.ilportaledellautomobilista.it/RichiestaPatenti/permessoProvvisorioGuida/ReadAcqPermessoProvvisorio_initAcqPermessoProvvisorio.action');
                await page.waitForTimeout(2000);
                
                await page.fill('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.numeroPatenteCompleto"]', numeroPatente);
                await page.fill('input[name="permessoProvvisorioGuidaView.permessoProvvisorioGuidaFrom.codiceFiscale"]', u.cf.toUpperCase());

                await page.click('input[name="action:ReadAcqPermessoProvvisorio_pagingAcqPermessoProvvisorio"]');
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
            
                const exp = await page.evaluate(() => {
                    return document.getElementById('noTastoInvio_permessoProvvisorioGuidaView_permessoProvvisorioGuidaFrom_thePatente_dataScadenza')?.value || null;
                });

                if (!exp) {
                    const utente = await programmaScadenziario.findOne({ "_id": u._id });
                    if (utente.try > 2) {
                        await programmaScadenziario.deleteOne({ "_id": u._id });
                        totalErrors++;
                    } else {
                        await programmaScadenziario.findOneAndUpdate({ "_id": u._id }, { $inc: { "try": 1 } });
                    }
                    continue; 
                }

                console.log("Scadenza:", exp);

                if (exp && numeroPatente) {
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
                        await programmaScadenziario.deleteOne({ "_id": u._id });
                    } catch (error) {
                        console.log(`Errore salvataggio scadenziario: ${error}`);
                        const utente = await programmaScadenziario.findOne({ "_id": u._id });
                        if (utente.try > 2) {
                            await programmaScadenziario.deleteOne({ "_id": u._id });
                            totalErrors++;
                        } else {
                            await programmaScadenziario.findOneAndUpdate({ "_id": u._id }, { $inc: { "try": 1 } });
                        }
                    }
                }

            } catch (innerError) {
                console.error(`Errore Playwright per utente ${u.cf}:`, innerError);
            } finally {
                if (page && !page.isClosed()) {
                    await page.close().catch(()=>{});
                }
            }
        } 

        return { totalErrors }; 

    } catch (error) {
        console.error('Errore globale dell\'operazione Playwright:', error);
        throw error;
    } finally {
        // Pulizia totale e sicura della RAM
        if (context) {
            await context.close().catch(()=>{});
        }
        if (browser) {
            await browser.close().catch(()=>{});
            console.log('Browser chiuso correttamente.');
        }
    }
}

module.exports = { searchUserPortale, searchExpirationPortale, searchScheduleExpirationPortale };