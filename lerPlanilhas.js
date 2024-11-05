const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Parser } = require('json2csv');

const diretorio = path.join(__dirname, '/data/05 MAIO 2024');
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
          const sheetName = workbook.SheetNames[3]; // Pega a tercfeira aba da planilha
          const sheet = workbook.Sheets[sheetName];

          // Coleta os dados de F33 até BC12 (zero-indexada) ANTES ESTAVA COL = 7; COL <= 55; QUANDO COLETAVA DADOS DOS OPERADORES NA PRIMEIRA ABA
          let linhaDados = [];
          for (let col = 5; col <= 52; col++) { // 7 = H, 55 = BC /// DADOS QUANDO FOR BUSCAR NA PRIMEIRA ABA
            const cellAddress = xlsx.utils.encode_cell({ r: 33, c: col }); // r: 33 -> linha 34 NA ABA DE "BD"
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
  const hour = 6;
  const camposCSV = ['arquivo', 'nomePlanilha', ...Array.from({ length: 48 }, (pp, i) =>{    
    
    //ToDo

    //fazer logica de quando vai ter zero no inicio ou não
    // fazer logica de quando somar ou não com a variável hour dependendo se o index "i" for impar ou par
    // criar os ifs necessários para executaqr o codigo acima
    const endstring = i%2 === 0 ? ":30" : "00"; // se for par, então escreve 30. Se não, escreve 00


    
    
    
    
    
    
    
return `coluna_${String.fromCharCode(70 + i)
  }`
  }
  )]; // 72 + i ANTERIORMENTE CABEALHO
  const json2csvParser = new Parser({ fields: camposCSV });
  const csv = json2csvParser.parse(dadosColetados.map(({ arquivo, nomePlanilha, dados }) => {

    const [dia, mes, anoXMLS] = arquivo.split(" ").filter(data => data && !String(data).toLowerCase().includes("de"))
    const ano = anoXMLS.split(".")[0]
    return {
      arquivo,
      nomePlanilha,
      ...dados.reduce((acc, val, index) => {
        acc[`coluna_${String.fromCharCode(70 + index)}`] = val; // F, G... BA
        return acc;
      }, {})
    };
  }));

  fs.writeFileSync('dadosColetados.csv', csv);
  console.log(`Dados coletados de ${dadosColetados.length} planilhas.`);
}, 5000); // Espera 5 segundos para garantir que todas as leituras estejam completas
