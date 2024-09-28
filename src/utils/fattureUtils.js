const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { create } = require('xmlbuilder2');
const axios = require('axios');

async function creaFatturaElettronica(dati, iscrizione, rinnovo, duplicato) {
    return new Promise(async (resolve, reject) => {
        try{
            let xml;

            if(iscrizione){
                xml = create({ version: '1.0', encoding: 'UTF-8' })
                .ele('p:FatturaElettronica')
                .att('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#')
                .att('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2')
                .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
                .att('versione', 'FPR12')
                .att('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd')        .ele('FatturaElettronicaHeader')
                .ele('DatiTrasmissione')
                    .ele('IdTrasmittente')
                        .ele('IdPaese').txt('IT').up()
                        .ele('IdCodice').txt('06498290011').up()
                    .up()
                    .ele('ProgressivoInvio').txt(dati.progressivoInvio).up()
                    .ele('FormatoTrasmissione').txt('FPR12').up()
                    .ele('CodiceDestinatario').txt(dati.codiceDestinatario).up()
                    .ele('ContattiTrasmittente')
                        .ele('Telefono').txt('0116507136').up()
                        .ele('Email').txt('autoscuola.centrale@libero.it').up()
                    .up()
                .up()
                .ele('CedentePrestatore')
                    .ele('DatiAnagrafici')
                        .ele('IdFiscaleIVA')
                            .ele('IdPaese').txt('IT').up()
                            .ele('IdCodice').txt('06498290011').up()
                        .up()
                        .ele('CodiceFiscale').txt('DMLNTN67S12L738X').up()
                        .ele('Anagrafica')
                            .ele('Denominazione').txt('D\'Amelio Antonio').up()
                        .up()
                        .ele('RegimeFiscale').txt('RF01').up()
                    .up()
                    .ele('Sede')
                        .ele('Indirizzo').txt('Corso Guglielmo Marconi, 33').up()
                        .ele('CAP').txt('10125').up()
                        .ele('Comune').txt('TORINO').up()
                        .ele('Provincia').txt('TO').up()
                        .ele('Nazione').txt('IT').up()
                    .up()
                .up()
                .ele('CessionarioCommittente')
                    .ele('DatiAnagrafici')
                        .ele('CodiceFiscale').txt(dati.codiceFiscaleCliente.toUpperCase().trim()).up()
                        .ele('Anagrafica')
                            .ele('Nome').txt(dati.nomeCliente.trim()).up()
                            .ele('Cognome').txt(dati.cognomeCliente.trim()).up()
                        .up()
                    .up()
                    .ele('Sede')
                        .ele('Indirizzo').txt(dati.indirizzoSedeCliente.replace(/\s/g, " ").trim()).up()
                        .ele('CAP').txt(dati.capSedeCliente.replace(/\s/g, "")).up()
                        .ele('Comune').txt(dati.comuneSedeCliente.replace(/\s/g, " ").trim()).up()
                        .ele('Provincia').txt(dati.provinciaSedeCliente.trim()).up()
                        .ele('Nazione').txt(dati.nazioneSedeCliente.trim()).up()
                    .up()
                .up()
            .up()
            .ele('FatturaElettronicaBody')
                .ele('DatiGenerali')
                    .ele('DatiGeneraliDocumento')
                        .ele('TipoDocumento').txt('TD01').up()
                        .ele('Divisa').txt('EUR').up()
                        .ele('Data').txt(dati.data).up()
                        .ele('Numero').txt(dati.numeroDocumento).up()
                        .ele('ImportoTotaleDocumento').txt(dati.ImportoTotaleDocumento).up()
                .up()
            .up()
            .ele('DatiBeniServizi')
                .ele('DettaglioLinee')
                    .ele('NumeroLinea').txt('1').up()
                    .ele('Descrizione').txt(dati.descrizione1).up()
                    .ele('PrezzoUnitario').txt(dati.prezzoUnitario1).up()
                    .ele('PrezzoTotale').txt(dati.prezzoTotale1).up()
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
                    .ele('Natura').txt('N1').up()
                .up()
                  .ele('DettaglioLinee')
                  .ele('NumeroLinea').txt('2').up()
                  .ele('Descrizione').txt(dati.descrizione2).up()
                  .ele('PrezzoUnitario').txt(dati.prezzoUnitario2).up()
                  .ele('PrezzoTotale').txt(dati.prezzoTotale2).up()
                  .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
                .up()
                .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo2).up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto1).up()
                    .ele('Imposta').txt(dati.imposta1).up()
                    .ele('EsigibilitaIVA').txt(dati.esigibilitaIVA1).up()
                .up()
                    .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo1).up()
                    .ele('Natura').txt('N1').up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto2).up()
                    .ele('Imposta').txt(dati.imposta2).up()
                    .ele('RiferimentoNormativo').txt(dati.RiferimentoNormativo2).up()
                .up()
            .up()
            .ele('DatiPagamento')
                .ele('CondizioniPagamento').txt(dati.condizioniPagamento).up()
                .ele('DettaglioPagamento')
                    .ele('ModalitaPagamento').txt(dati.modalitaPagamento).up()
                    .ele('ImportoPagamento').txt(dati.importoPagamento)
                .up()
            .up()
                .up();
        }else if(rinnovo || duplicato){
            xml = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('p:FatturaElettronica')
        .att('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#')
        .att('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2')
        .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .att('versione', 'FPR12')
        .att('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd')        
        .ele('FatturaElettronicaHeader')
            .ele('DatiTrasmissione')
                .ele('IdTrasmittente')
                    .ele('IdPaese').txt('IT').up()
                    .ele('IdCodice').txt('06498290011').up()
                .up()
                .ele('ProgressivoInvio').txt(dati.progressivoInvio).up()
                .ele('FormatoTrasmissione').txt('FPR12').up()
                .ele('CodiceDestinatario').txt(dati.codiceDestinatario).up()
                .ele('ContattiTrasmittente')
                    .ele('Telefono').txt('0116507136').up()
                    .ele('Email').txt('autoscuola.centrale@libero.it').up()
                .up()
            .up()
            .ele('CedentePrestatore')
                .ele('DatiAnagrafici')
                    .ele('IdFiscaleIVA')
                        .ele('IdPaese').txt('IT').up()
                        .ele('IdCodice').txt('06498290011').up()
                    .up()
                    .ele('CodiceFiscale').txt('DMLNTN67S12L738X').up()
                    .ele('Anagrafica')
                        .ele('Denominazione').txt('D\'Amelio Antonio').up()
                    .up()
                    .ele('RegimeFiscale').txt('RF01').up()
                .up()
                .ele('Sede')
                    .ele('Indirizzo').txt('Corso Guglielmo Marconi, 33').up()
                    .ele('CAP').txt('10125').up()
                    .ele('Comune').txt('TORINO').up()
                    .ele('Provincia').txt('TO').up()
                    .ele('Nazione').txt('IT').up()
                .up()
            .up()
            .ele('CessionarioCommittente')
                .ele('DatiAnagrafici')
                    .ele('CodiceFiscale').txt(dati.codiceFiscaleCliente.toUpperCase().trim()).up()
                    .ele('Anagrafica')
                        .ele('Nome').txt(dati.nomeCliente.trim()).up()
                        .ele('Cognome').txt(dati.cognomeCliente.trim()).up()
                    .up()
                .up()
                .ele('Sede')
                    .ele('Indirizzo').txt(dati.indirizzoSedeCliente.replace(/\s/g, " ").trim()).up()
                    .ele('CAP').txt(dati.capSedeCliente.replace(/\s/g, "")).up()
                    .ele('Comune').txt(dati.comuneSedeCliente.replace(/\s/g, " ").trim()).up()
                    .ele('Provincia').txt(dati.provinciaSedeCliente.trim()).up()
                    .ele('Nazione').txt(dati.nazioneSedeCliente.trim()).up()
                .up()
            .up()
        .up()
        .ele('FatturaElettronicaBody')
            .ele('DatiGenerali')
                .ele('DatiGeneraliDocumento')
                    .ele('TipoDocumento').txt('TD01').up()
                    .ele('Divisa').txt('EUR').up()
                    .ele('Data').txt(dati.data).up()
                    .ele('Numero').txt(dati.numeroDocumento).up()
                    .ele('ImportoTotaleDocumento').txt(dati.ImportoTotaleDocumento).up()
                .up()
            .up()
            .ele('DatiBeniServizi')
                .ele('DettaglioLinee')
                    .ele('NumeroLinea').txt('1').up()
                    .ele('Descrizione').txt(dati.descrizione2).up()
                    .ele('PrezzoUnitario').txt(dati.prezzoUnitario2).up()
                    .ele('PrezzoTotale').txt(dati.prezzoTotale2).up()
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
                    .ele('Natura').txt('N1').up()
                .up()
                  .ele('DettaglioLinee')
                  .ele('NumeroLinea').txt('2').up()
                  .ele('Descrizione').txt(dati.descrizione1).up()
                  .ele('PrezzoUnitario').txt(dati.prezzoUnitario1).up()
                  .ele('PrezzoTotale').txt(dati.prezzoTotale1).up()
                  .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
                .up()
                .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
                    .ele('Natura').txt('N1').up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto2).up()
                    .ele('Imposta').txt(dati.imposta2).up()
                .up()
                .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto1).up()
                    .ele('Imposta').txt(dati.imposta1).up()
                    .ele('EsigibilitaIVA').txt('I').up()
                .up()
            .up()
            .ele('DatiPagamento')
                .ele('CondizioniPagamento').txt(dati.condizioniPagamento).up()
                .ele('DettaglioPagamento')
                    .ele('ModalitaPagamento').txt(dati.modalitaPagamento).up()
                    .ele('ImportoPagamento').txt(dati.importoPagamento)
                .up()
            .up()
        .up();
        }else{
            xml = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('p:FatturaElettronica')
        .att('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#')
        .att('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2')
        .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .att('versione', 'FPR12')
        .att('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd')        
        .ele('FatturaElettronicaHeader')
            .ele('DatiTrasmissione')
                .ele('IdTrasmittente')
                    .ele('IdPaese').txt('IT').up()
                    .ele('IdCodice').txt('06498290011').up()
                .up()
                .ele('ProgressivoInvio').txt(dati.progressivoInvio).up()
                .ele('FormatoTrasmissione').txt('FPR12').up()
                .ele('CodiceDestinatario').txt(dati.codiceDestinatario).up()
                .ele('ContattiTrasmittente')
                    .ele('Telefono').txt('0116507136').up()
                    .ele('Email').txt('autoscuola.centrale@libero.it').up()
                .up()
            .up()
            .ele('CedentePrestatore')
                .ele('DatiAnagrafici')
                    .ele('IdFiscaleIVA')
                        .ele('IdPaese').txt('IT').up()
                        .ele('IdCodice').txt('06498290011').up()
                    .up()
                    .ele('CodiceFiscale').txt('DMLNTN67S12L738X').up()
                    .ele('Anagrafica')
                        .ele('Denominazione').txt('D\'Amelio Antonio').up()
                    .up()
                    .ele('RegimeFiscale').txt('RF01').up()
                .up()
                .ele('Sede')
                    .ele('Indirizzo').txt('Corso Guglielmo Marconi, 33').up()
                    .ele('CAP').txt('10125').up()
                    .ele('Comune').txt('TORINO').up()
                    .ele('Provincia').txt('TO').up()
                    .ele('Nazione').txt('IT').up()
                .up()
            .up()
            .ele('CessionarioCommittente')
                .ele('DatiAnagrafici')
                    .ele('IdFiscaleIVA')
                        .ele('IdPaese').txt(dati.IdPaeseCliente).up()
                        .ele('IdCodice').txt(dati.partitaIvaCliente).up()
                    .up()
                    .ele('CodiceFiscale').txt(dati.codiceFiscaleCliente.toUpperCase()).up()
                    .ele('Anagrafica')
                        .ele('Nome').txt(dati.nomeCliente).up()
                        .ele('Cognome').txt(dati.cognomeCliente).up()
                    .up()
                .up()
                .ele('Sede')
                    .ele('Indirizzo').txt(dati.indirizzoSedeCliente.replace(/\s/g, " ").trim()).up()
                    .ele('CAP').txt(dati.capSedeCliente.replace(/\s/g, "")).up()
                    .ele('Comune').txt(dati.comuneSedeCliente.replace(/\s/g, " ").trim()).up()
                    .ele('Provincia').txt(dati.provinciaSedeCliente).up()
                    .ele('Nazione').txt(dati.nazioneSedeCliente).up()
                .up()
            .up()
        .up()
        .ele('FatturaElettronicaBody')
            .ele('DatiGenerali')
                .ele('DatiGeneraliDocumento')
                    .ele('TipoDocumento').txt('TD01').up()
                    .ele('Divisa').txt('EUR').up()
                    .ele('Data').txt(dati.data).up()
                    .ele('Numero').txt(dati.numeroDocumento).up()
                    .ele('ImportoTotaleDocumento').txt(dati.ImportoTotaleDocumento).up()
                .up()
            .up()
            .ele('DatiBeniServizi')
                .ele('DettaglioLinee')
                    .ele('NumeroLinea').txt('1').up()
                    .ele('Descrizione').txt(dati.descrizione1).up()
                    .ele('PrezzoUnitario').txt(dati.prezzoUnitario1).up()
                    .ele('PrezzoTotale').txt(dati.prezzoTotale1).up()
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
                .up()
                  .ele('DettaglioLinee')
                  .ele('NumeroLinea').txt('2').up()
                  .ele('Descrizione').txt(dati.descrizione2).up()
                  .ele('PrezzoUnitario').txt(dati.prezzoUnitario2).up()
                  .ele('PrezzoTotale').txt(dati.prezzoTotale2).up()
                  .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
                  .ele('Natura').txt('N1').up()
                .up()
                .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo1).up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto1).up()
                    .ele('Imposta').txt(dati.imposta1).up()
                    .ele('EsigibilitaIVA').txt(dati.esigibilitaIVA1).up()
                .up()
                    .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo2).up()
                    .ele('Natura').txt('N1').up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto2).up()
                    .ele('Imposta').txt(dati.imposta2).up()
                    .ele('RiferimentoNormativo').txt(dati.RiferimentoNormativo2).up()
                .up()
            .up()
            .ele('DatiPagamento')
                .ele('CondizioniPagamento').txt(dati.condizioniPagamento).up()
                .ele('DettaglioPagamento')
                    .ele('ModalitaPagamento').txt(dati.modalitaPagamento).up()
                    .ele('ImportoPagamento').txt(dati.importoPagamento)
                .up()
            .up()
        .up();
        }
        const xmlString = xml.end({ prettyPrint: true });
        const nomeFile = `IT06498290011_${dati.progressivoInvio}.xml`;

        await fs.writeFile(path.join('fatture/elettroniche', nomeFile), xmlString);
        resolve('Fattura elettronica salvata con successo');
        
        } catch (err) {
            console.error('Errore durante il salvataggio del file:', err);
            reject(new Error('Errore durante il salvataggio della fattura elettronica'));
        }
    });
}



const utenti = require('../DB/User');
async function creaFatturaCortesia(dati, iscrizione) {
    return new Promise(async (resolve, reject) => {
        try {
            if(iscrizione){
                const utente = await utenti.findOne({ "cFiscale": dati.codiceFiscaleCliente });
                const patente = utente.patente.find(item => item.pagato === true && item.bocciato === null);
                dati.descrizionePdf =`iscrizione patente ${patente.tipo}` ;
            }else{
                dati.descrizionePdf = dati.descrizione1;
            }

            const doc = new PDFDocument();
            doc.fontSize(16).text('Autoscuola Centrale', { align: 'left' });
            doc.text('Corso Marconi 33 - 10125 Torino (TO)', { align: 'left' });
            doc.text('P.IVA 06498290011', { align: 'left' });
            doc.text('Fattura di Cortesia', { align: 'right' });
            doc.moveDown();

            doc.moveDown();
            doc.rect(50, doc.y, 500, 1).fill('#000');
            doc.moveDown();

            doc.text('CLIENTE', { underline: true });
            doc.rect(50, doc.y + 10, 500, 200).stroke();
            doc.moveDown();
            doc.text(`Nome: ${dati.nomeCliente} ${dati.cognomeCliente}`, 60, doc.y + 20);
            doc.text(`Numero: ${dati.progressivoInvio}`, 60, doc.y + 20);
            doc.text(`Indirizzo: ${dati.indirizzoSedeCliente} ${dati.capSedeCliente} ${dati.comuneSedeCliente} (${dati.provinciaSedeCliente})`,  60, doc.y + 20);
            doc.text(`Data: ${dati.data}`, 60, doc.y + 20);
            doc.text(`C.Fiscale: ${dati.codiceFiscaleCliente}`, 60, doc.y + 20);
            doc.moveDown();

            // Box per dettagli della fattura
            doc.text('Dettagli Fattura', { underline: true });
            doc.moveDown();
            doc.text('Data             Descrizione');
            doc.fontSize(9);
            doc.text(`${dati.data}`, { continued: true });
            doc.text(`                                      ${dati.descrizionePdf}`)
            doc.moveDown();
            doc.moveDown();
            doc.text('TOTALE IMPONIBILE: ', { continued: true });
            doc.text(`${dati.imponibileImporto1} €`);
            doc.text('IVA 22%: ', { continued: true });
            doc.text(`${(Number(dati.imponibileImporto1) * 0.22).toFixed(2)} €`);
            doc.moveDown();
            doc.text(`anticipazioni conto cliente`);
            doc.text(`esclusiva iva art.15 dpr 633/72 diritti della Motorizzazione e imposte di bollo € ${dati.prezzoUnitario2}`);
            doc.moveDown();
            doc.text('TOTALE FATTURA: ', { continued: true });
            doc.text(`${dati.ImportoTotaleDocumento} €`);
            doc.moveDown();
            doc.moveDown();
            doc.fillColor("#FF0000").text(`Fattura di cortesia  non valida ai fini fiscali.`);
            doc.text(`La fattura è stata emessa in formato elettronico ed è consultabile nel cassetto fiscale`);
            const buffers = [];
            const pdfBufferPromise = new Promise((resolve, reject) => {
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);
            });
            doc.end();
            
            pdfBuffer = await pdfBufferPromise;

            await fs.writeFile(`./fatture/cortesia/fattura_${dati.nomeCliente}_${dati.cognomeCliente}.pdf`, pdfBuffer);
            resolve('Fattura di cortesia salvata con successo');
        } catch (err) {
            console.error('Errore durante il salvataggio della fattura di cortesia:', err);
            reject(new Error('Errore durante il salvataggio della fattura di cortesia'));
        }
    });
}


const scaricaFatturaAPI = async (invoiceId) => {
    const url = `https://agenda-autoscuolacentrale.com/invoice/${invoiceId}`;
    const filePath = path.join('fatture', 'elettroniche', `IT06498290011_g00${invoiceId}.xml`);
   
    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': process.env.API_KEY_AGENDA
            },
            responseType: 'arraybuffer'
        });

        await fs.writeFile(filePath, response.data);
    } catch (error) {
        console.error(`Failed to download invoice ${invoiceId}:`, error.message);
    }
  };


module.exports = {creaFatturaElettronica, creaFatturaCortesia, scaricaFatturaAPI};

