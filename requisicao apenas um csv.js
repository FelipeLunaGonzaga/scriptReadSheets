const fs = require('fs');

// Nome do arquivo CSV único
const nomeArquivoCSV = 'dados_demandas.csv';

// Verificar e criar o cabeçalho do arquivo CSV (se ainda não existir)
function inicializarArquivoCSV() {
    if (!fs.existsSync(nomeArquivoCSV)) {
        const cabecalho = 'Data,Intervalo,NumeroDeVoos\n';
        fs.writeFileSync(nomeArquivoCSV, cabecalho, 'utf8');
    }
}

// Função principal
async function coletarDadosDemandas() {
    const token = 'd046a4fc-ff71-4f28-91ec-0ff77d4e36df';
    const urlsPorDia = gerarDatasComLinks();
    const horarios = gerarHorarios();

    inicializarArquivoCSV(); // Garantir que o arquivo CSV esteja preparado

    for (const { date, urlDiaEspecifico } of urlsPorDia) {
        const horariosLinha = [];
        const voosLinha = [];

        try {
            console.log(`Processando data: ${date}`);
            console.time(`Tempo para processar ${date}`);

            // Passo 1: Obter o ID da página
            const idEspecifico2 = await obterIdPagina(urlDiaEspecifico, token);

            // Passo 2: Obter o ID SBRE
            const idSBRE = await obterIdSbre(idEspecifico2, token);

            const baseURLFinal = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico2}/regulatedElementOfSession/${idSBRE}/flightIntentions`;

            // Passo 3: Requisição por intervalos
            for (const intervalo of horarios) {
                const url = `${baseURLFinal}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=THIRTY_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;

                try {
                    const numeroDeVoos = await obterVoosIntervalo(url, token, intervalo);
                    console.log(`Data ${date}, intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);

                    horariosLinha.push(`${intervalo.begin} - ${intervalo.end}`);
                    voosLinha.push(numeroDeVoos);
                } catch (err) {
                    console.error(`Erro no intervalo ${intervalo.begin} - ${intervalo.end}: ${err.message}`);
                }
            }

            salvarComoCSV(date, horariosLinha, voosLinha);
            console.timeEnd(`Tempo para processar ${date}`);
        } catch (err) {
            console.error(`Erro ao processar a data ${date}: ${err.message}`);
        }
    }
}

// Função para salvar os dados no arquivo CSV único
function salvarComoCSV(date, horariosLinha, voosLinha) {
    const linhas = horariosLinha.map((intervalo, index) => {
        const numeroDeVoos = voosLinha[index];
        return `${date},${intervalo},${numeroDeVoos}`;
    }).join('\n');

    fs.appendFileSync(nomeArquivoCSV, linhas + '\n', 'utf8');
    console.log(`Dados adicionados ao arquivo "${nomeArquivoCSV}"`);
}

// Função para obter o ID da página
async function obterIdPagina(url, token) {
    const resposta = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!resposta.ok) {
        throw new Error(`Erro ao obter ID da página: ${resposta.statusText}`);
    }

    const dados = await resposta.json();
    return dados.content && dados.content.length > 0 ? dados.content[0].id : null;
}

// Função para obter o ID SBRE
async function obterIdSbre(idEspecifico, token) {
    const url = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=1&size=8&regulatedType=FIR_SECTOR_GROUP&name=SBRE&sessionInterval=THIRTY_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`;

    const resposta = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!resposta.ok) {
        throw new Error(`Erro ao obter ID SBRE: ${resposta.statusText}`);
    }

    const dados = await resposta.json();
    const objetoSBRE = dados.content.find((obj) => obj.name === "SBRE");

    if (!objetoSBRE) {
        throw new Error('ID SBRE não encontrado.');
    }

    return objetoSBRE.id;
}

// Função para obter número de voos em um intervalo
async function obterVoosIntervalo(url, token, intervalo) {
    const resposta = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!resposta.ok) {
        throw new Error(`Erro na requisição do intervalo ${intervalo.begin} - ${intervalo.end}: ${resposta.statusText}`);
    }

    const dados = await resposta.json();
    return dados.totalElements || 0;
}

// Gerar intervalos de horários
function gerarHorarios() {
    const horarios = [];
    for (let hora = 0; hora < 24; hora++) {
        const horaStr = hora.toString().padStart(2, '0');
        const proximaHoraStr = ((hora + 1) % 24).toString().padStart(2, '0');
        horarios.push({ begin: `${horaStr}:00`, end: `${horaStr}:30` });
        horarios.push({ begin: `${horaStr}:30`, end: `${proximaHoraStr}:00` });
    }
    return horarios;
}

// Gerar datas com links para URLs
function gerarDatasComLinks() {
    const links = [];
    const startDate = new Date('2025-01-02'); // vai fazer requisições no dia anterior ao selecionado
    const endDate = new Date('2025-01-10'); // vai fazer requisições no dia anterior ao selecionado

    while (startDate <= endDate) {
        const year = startDate.getFullYear();
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');

        const url = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL?page=1&size=8&sortActive=beginDate&sortDirection=desc&sessionType=HISTORICAL&beginDate=${year}-${month}-${day}T00:00:00.000Z`;

        links.push({ date: `${year}-${month}-${day}`, urlDiaEspecifico: url });
        startDate.setDate(startDate.getDate() + 1);
    }

    return links;
}

// Executar a função principal
coletarDadosDemandas();
