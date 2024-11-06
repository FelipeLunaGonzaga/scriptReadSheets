"use strict";
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Parser } = require('json2csv');
const diretorio = path.join(__dirname, '01 JANEIRO 2024');
let dadosColetados = [];
function lerPlanilhasEmDiretorio(diretorio) {
    fs.readdir(diretorio, (err, arquivos) => {
        if (err) {
            console.error('Erro ao ler o diretório:', err);
            return;
        }
        arquivos.forEach((arquivo, i) => {
            console.log(i, arquivo);
            const caminhoCompleto = path.join(diretorio, arquivo);
            fs.stat(caminhoCompleto, (err, stats) => {
                if (err) {
                    console.error('Erro ao obter informações do arquivo:', err);
                    return;
                }
                if (stats.isDirectory()) {
                    lerPlanilhasEmDiretorio(caminhoCompleto);
                }
                else if (path.extname(arquivo) === '.xlsx' || path.extname(arquivo) === '.xls') {
                    const workbook = xlsx.readFile(caminhoCompleto);
                    const sheetName = workbook.SheetNames[0]; // Pega a primeira aba da planilha
                    const sheet = workbook.Sheets[sheetName];
                    // Coleta os dados de H12 até BC12
                    let linhaDados = [];
                    for (let col = 7; col <= 55; col++) { // 7 = H, 55 = BC
                        const cellAddress = xlsx.utils.encode_cell({ r: 12, c: col }); // r: 12 -> linha 13 (zero-indexada)
                        const cell = sheet[cellAddress];
                        linhaDados.push(cell ? cell.v : '');
                    }
                    dadosColetados.push({
                        arquivo: arquivo,
                        dados: linhaDados,
                    });
                }
            });
        });
    });
}
if (fs.existsSync(diretorio)) {
    lerPlanilhasEmDiretorio(diretorio);
}
else {
    console.error('O diretório especificado não existe:', diretorio);
}
setTimeout(() => {
    const camposCSV = ['dia', ...Array.from({ length: 48 }, (_, i) => `coluna_${String.fromCharCode(72 + i)}`)]; //"mês","ano"
    const json2csvParser = new Parser({ fields: camposCSV });
    const csv = json2csvParser.parse(dadosColetados.map(({ arquivo, dados }) => {
        // const [dia,,mes,,ano] = arquivo.split(" ") tarefa de casa
        return Object.assign({ arquivo }, dados.reduce((acc, val, index) => {
            acc[`coluna_${String.fromCharCode(72 + index)}`] = val; // H, I, J, ... BC
            return acc;
        }, {}));
    }));
    console.log(dadosColetados.length);
    fs.writeFileSync('dadosColetados.csv', csv);
}, 5000);
