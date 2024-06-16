const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { create } = require('xmlbuilder2');

async function creaFatturaElettronica(dati) {
    return new Promise(async (resolve, reject) => {
        try{
        const xml = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('p:FatturaElettronica')
        .att('xmlns:ds', 'http://www.w3.org/2000/09/xmldsig#')
        .att('xmlns:p', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2')
        .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        .att('versione', 'FPR12')
        .att('xsi:schemaLocation', 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd')        .ele('FatturaElettronicaHeader')
                .ele('DatiTrasmissione')
                    .ele('IdTrasmittente')
                        .ele('IdPaese').txt(dati.IdPaese).up()
                        .ele('IdCodice').txt(dati.IdCodice).up()
                    .up()
                    .ele('ProgressivoInvio').txt(dati.progressivoInvio).up()
                    .ele('FormatoTrasmissione').txt(dati.formatoTrasmissione).up()
                    .ele('CodiceDestinatario').txt(dati.codiceDestinatario).up()
                    .ele('ContattiTrasmittente')
                        .ele('Telefono').txt(dati.telefonoTrasmittente).up()
                        .ele('Email').txt(dati.emailTrasmittente).up()
                    .up()
                .up()
                .ele('CedentePrestatore')
                    .ele('DatiAnagrafici')
                        .ele('IdFiscaleIVA')
                            .ele('IdPaese').txt(dati.IdPaese).up()
                            .ele('IdCodice').txt(dati.IdCodice).up()
                        .up()
                        .ele('CodiceFiscale').txt(dati.codiceFiscaleCedente).up()
                        .ele('Anagrafica')
                            .ele('Denominazione').txt(dati.denominazioneCedente).up()
                        .up()
                        .ele('RegimeFiscale').txt(dati.regimeFiscaleCedente).up()
                    .up()
                    .ele('Sede')
                        .ele('Indirizzo').txt(dati.indirizzoSedeCedente).up()
                        .ele('CAP').txt(dati.capSedeCedente).up()
                        .ele('Comune').txt(dati.comuneSedeCedente).up()
                        .ele('Provincia').txt(dati.provinciaSedeCedente).up()
                        .ele('Nazione').txt(dati.nazioneSedeCedente).up()
                    .up()
                .up()
                .ele('CessionarioCommittente')
                    .ele('DatiAnagrafici')
                        .ele('CodiceFiscale').txt(dati.codiceFiscaleCliente).up()
                        .ele('Anagrafica')
                            .ele('Nome').txt(dati.nomeCliente).up()
                            .ele('Cognome').txt(dati.cognomeCliente).up()
                        .up()
                    .up()
                    .ele('Sede')
                        .ele('Indirizzo').txt(dati.indirizzoSedeCliente).up()
                        .ele('CAP').txt(dati.capSedeCliente).up()
                        .ele('Comune').txt(dati.comuneSedeCliente).up()
                        .ele('Provincia').txt(dati.provinciaSedeCliente).up()
                        .ele('Nazione').txt(dati.nazioneSedeCliente).up()
                    .up()
                .up()
            .up()
            .ele('FatturaElettronicaBody')
                .ele('DatiGenerali')
                    .ele('DatiGeneraliDocumento')
                        .ele('TipoDocumento').txt(dati.tipoDocumento).up()
                        .ele('Divisa').txt(dati.divisa).up()
                        .ele('Data').txt(dati.data).up()
                        .ele('Numero').txt(dati.numeroDocumento).up()
                        .ele('ImportoTotaleDocumento').txt(dati.ImportoTotaleDocumento).up()
                .up()
            .up()
            .ele('DatiBeniServizi')
                .ele('DettaglioLinee')
                    .ele('NumeroLinea').txt(dati.numeroLinea1).up()
                    .ele('Descrizione').txt(dati.descrizione1).up()
                    .ele('PrezzoUnitario').txt(dati.prezzoUnitario1).up()
                    .ele('PrezzoTotale').txt(dati.prezzoTotale1).up()
                    .ele('AliquotaIVA').txt(dati.aliquotaIVA1).up()
                    .ele('Natura').txt(dati.natura1).up()
                .up()
                  .ele('DettaglioLinee')
                  .ele('NumeroLinea').txt(dati.numeroLinea2).up()
                  .ele('Descrizione').txt(dati.descrizione2).up()
                  .ele('PrezzoUnitario').txt(dati.prezzoUnitario2).up()
                  .ele('PrezzoTotale').txt(dati.prezzoTotale2).up()
                  .ele('AliquotaIVA').txt(dati.aliquotaIVA2).up()
                .up()
                .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo1).up()
                    .ele('ImponibileImporto').txt(dati.imponibileImporto1).up()
                    .ele('Imposta').txt(dati.imposta1).up()
                    .ele('EsigibilitaIVA').txt(dati.esigibilitaIVA1).up()
                .up()
                    .ele('DatiRiepilogo')
                    .ele('AliquotaIVA').txt(dati.aliquotaIVARiepilogo2).up()
                    .ele('Natura').txt(dati.natura2).up()
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

        const xmlString = xml.end({ prettyPrint: true });
        const nomeBaseFile = `${dati.IdPaese}${dati.IdCodice}_${dati.progressivoInvio}.xml`;
        let nomeFile = nomeBaseFile;

        let counter = 1;

            while (await fs.access(path.join('fatture/elettroniche', nomeFile)).then(() => true).catch(() => false)) {
                nomeFile = `${nomeBaseFile}_${counter}.xml`;
                counter++;
            }
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
                dati.patente =`iscrizione patente ${patente.tipo}` ;
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
            doc.text(`                                      ${dati.patente}`)
            doc.moveDown();
            doc.moveDown();
            doc.text('TOTALE IMPONIBILE: ', { continued: true });
            doc.text(`${dati.imponibileImporto1} €`);
            doc.text('IVA 22%: ', { continued: true });
            doc.text(`${(Number(dati.imponibileImporto1) * 0.22).toFixed(2)} €`);
            doc.moveDown();
            doc.text(`anticipazioni conto cliente`);
            doc.text(`esclusiva iva art.15 dpr 633/72 diritti della Motorizzazione e imposte di bollo €`);
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





module.exports = {creaFatturaElettronica, creaFatturaCortesia};

