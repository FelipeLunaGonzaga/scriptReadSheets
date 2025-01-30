const fs = require("fs");
const { Parser } = require("json2csv");
const moment = require("moment");
require("moment/locale/pt-br");
moment.locale("pt-br");

const horariosPermitidos = [
  "06:30:00","07:00:00","07:30:00","08:00:00","08:30:00","09:00:00",
  "09:30:00","10:00:00","10:30:00","11:00:00","11:30:00","12:00:00",
  "12:30:00","13:00:00","13:30:00","14:00:00","14:30:00","15:00:00",
  "15:30:00","16:00:00","16:30:00","17:00:00","17:30:00","18:00:00",
  "18:30:00","19:00:00","19:30:00","20:00:00","20:30:00","21:00:00",
  "21:30:00","22:00:00","22:30:00","23:00:00","23:30:00","00:00:00",
  "00:30:00","01:00:00","01:30:00","02:00:00","02:30:00","03:00:00",
  "03:30:00","04:00:00","04:30:00","05:00:00","05:30:00","06:00:00"
];

function getDiaDaSemanaEmPortugues(data) {
  const [dia, mes, ano] = data.split('/').map(Number);
  const dataObj = new Date(ano, mes - 1, dia); // Ajuste de mês, pois começa em 0
  const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return diasDaSemana[dataObj.getDay()];
}
// Função para processar cada arquivo CSV específico
function processarArquivoCSV(caminhoArquivo) {
  const leituraCsv = fs.readFileSync(caminhoArquivo, "utf8");

  const linhasCsv = leituraCsv.split("\n").map(linha => linha.split(';'));
  const arrayStartingWith3And0 = [];
  let ultimoHorario = '';

  for (const linha of linhasCsv) {
    const [semana, dia, hora, ...resto] = linha;
    if (hora && ultimoHorario !== hora && (hora[3] === "3" || hora[3] === "0")) {
      ultimoHorario = hora;
      arrayStartingWith3And0.push([...linha]);
    }
  }

  const filtradosPorHorario = arrayStartingWith3And0.filter(linha => horariosPermitidos.includes(linha[2]));

  const setoresSplit = filtradosPorHorario.map(linha => linha[11].split("|").length);

  const linhaDeSetores = Array(horariosPermitidos.length).fill('');
  for (let i = 0; i < horariosPermitidos.length; i++) {
    const horarioIndex = filtradosPorHorario.findIndex(linha => linha[2] === horariosPermitidos[i]);
    linhaDeSetores[i] = horarioIndex !== -1 ? setoresSplit[horarioIndex] : '';
  }

  // Verifica se existem dados em 'filtradosPorHorario' antes de acessar
  const data = filtradosPorHorario.length > 0 ? filtradosPorHorario[0][1] : '';
  const diaDaSemana = data ? getDiaDaSemanaEmPortugues(data) : ''; // Evita o erro ao acessar uma data vazia

  // Retorna os dados organizados em um objeto para o CSV
  return {
    Dia: data,
    DiaDaSemana: diaDaSemana, // Nova coluna com o dia da semana em pt-BR
    ...Object.fromEntries(horariosPermitidos.map((horario, i) => [horario, linhaDeSetores[i]]))
  };
}


// Função para adicionar todos os dados de diretórios e arquivos
function adicionarPlanilhasDeDiretorio(diretorio) {
  const arquivos = fs.readdirSync(diretorio, 'utf8');
  const arquivosFiltrados = arquivos.filter(nomeDoArquivo => nomeDoArquivo.includes("_sect_config.csv"));

  // Variável para controlar o cabeçalho CSV
  let isPrimeiraLinha = true;

  arquivosFiltrados.forEach((arquivo) => {
    const caminhoArquivo = `${diretorio}/${arquivo}`;
    const dadosDia = processarArquivoCSV(caminhoArquivo);

    // Define o cabeçalho e converte para CSV
    const headerCSV = ['Dia', 'DiaDaSemana', ...horariosPermitidos];
    const json2csvParser = new Parser({ fields: headerCSV });
    const csv = json2csvParser.parse([dadosDia]);

    // Insere o cabeçalho apenas na primeira linha e apenas uma vez
    if (isPrimeiraLinha) {
      fs.appendFileSync('janeiroSOTSetores.csv', csv + "\n", "utf8");
      isPrimeiraLinha = false;
    } else {
      const csvSemHeader = csv.split("\n").slice(1).join("\n");
      fs.appendFileSync('janeiroSOTSetores.csv', csvSemHeader + "\n", "utf8");
    }
  });
  console.log(`Arquivos do diretório ${diretorio} processados com sucesso!`);
}

// Lê todos os diretórios em "./datasot" e processa cada um
fs.readdirSync("./datasot").forEach(diretorio => adicionarPlanilhasDeDiretorio(`./datasot/${diretorio}`));
