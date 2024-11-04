const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Parser } = require('json2csv');

console.log("oh yes")
const diretorio = path.join(__dirname,'/data/01 JANEIRO 2024');
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
        } else if (path.extname(arquivo) === '.xlsx' || path.extname(arquivo) === '.xls') {
          const workbook = xlsx.readFile(caminhoCompleto);
          const sheetName = workbook.SheetNames[0]; // Pega a primeira aba da planilha
          const sheet = workbook.Sheets[sheetName];

          // Coleta os dados de H12 até BC12 (linha 12, zero-indexada é 11)
          let linhaDados = [];
          for (let col = 7; col <= 55; col++) { // 7 = H, 55 = BC
            const cellAddress = xlsx.utils.encode_cell({ r: 11, c: col }); // r: 11 -> linha 12
            const cell = sheet[cellAddress];
            linhaDados.push(cell ? cell.v : '');
          }

          dadosColetados.push({
            arquivo: arquivo,
            nomePlanilha: sheetName,
            dados: linhaDados,
          });
        }
      });
    });
  });
}

if (fs.existsSync(diretorio)) {
  lerPlanilhasEmDiretorio(diretorio);
} else {
  console.error('O diretório especificado não existe:', diretorio);
}

setTimeout(() => {
  const camposCSV = ['arquivo', 'nomePlanilha', ...Array.from({ length: 49 }, (_, i) => `coluna_${String.fromCharCode(72 + i)}`)];
  const json2csvParser = new Parser({ fields: camposCSV });
  const csv = json2csvParser.parse(dadosColetados.map(({ arquivo, nomePlanilha, dados }) => {
    return {
      arquivo,
      nomePlanilha,
      ...dados.reduce((acc, val, index) => {
        acc[`coluna_${String.fromCharCode(72 + index)}`] = val; // H, I, J, ... BC
        return acc;
      }, {})
    };
  }));

  fs.writeFileSync('dadosColetados.csv', csv);
  console.log(`Dados coletados de ${dadosColetados.length} planilhas.`);
}, 5000); // Espera 5 segundos para garantir que todas as leituras estejam completas
