const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { error } = require('console');
const { resolve } = require('path');

// Função para capturar o Bearer Token
async function getBearerToken(url, email, password) {
    let browser;
    try {
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

        browser = await puppeteer.launch({
            executablePath: edgePath,
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        let bearerToken = null;

        page.on('request', (request) => {
            const headers = request.headers();
            if (headers['authorization']?.startsWith('Bearer ')) {
                bearerToken = headers['authorization'].replace('Bearer ', '');
            }
        });

        console.log('Acessando página de login...');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

        await page.waitForSelector('input[placeholder="Digite a senha cadastrada"]', { timeout: 20000 });

        console.log('Preenchendo credenciais...');
        await page.type('input[placeholder="Digite o nome de usuário cadastrado"]', email, { delay: 100 });
        await page.type('input[placeholder="Digite a senha cadastrada"]', password, { delay: 100 });

        console.log('Realizando login...');
        await Promise.all([
            page.click('button.v-button.submit[data-test="login-submit-button"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        ]);

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!bearerToken) throw new Error('Bearer Token não capturado.');

        console.log('Bearer Token capturado:', bearerToken);
        await browser.close();
        return bearerToken;
    } catch (error) {
        console.error('Erro ao coletar Bearer Token:', error);
        if (browser) await browser.close();
        throw error;
    }
}

// Função para realizar requisições com retentativas
async function fetchWithRetry(url, token, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await new Promise(r => setTimeout(r, 1000));
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou: ${error.message}`);
            if (attempt === maxAttempts) throw error;
        }
    }
}

// Função principal
// Função principal
async function coletarDadosDemandas() {
    try {
        // Garante que o token será coletado antes de prosseguir
        const token = await getBearerToken(
            'https://sigma.decea.mil.br/sigma-ui/login',
            'lunaflg',
            '01I@mmanm'
        );

        console.log('Token coletado:', token);

        const urlsPorDia = gerarDatasComLinks();
        const horarios = gerarHorarios();

        for (const { date, urlDiaEspecifico } of urlsPorDia) {
            var horariosLinha = [];


            try {

                const urlBeginDate = 'https://sigma.decea.mil.br/sigma-api/v1/sessions/STRATEGICAL?page=1&size=8&sortActive=beginDate&sortDirection=desc&sessionType=STRATEGICAL';

                var dadosBeginDate = await obterTodosDadosResposta(urlBeginDate, token);

                console.log(`Todos os dados IDs Content encontrados são - ${dadosBeginDate}`);

                console.log(`Processando data: ${date}`);
                console.time(`Tempo para processar ${date}`);

                var idEspecifico2 = await obterIdPagina(urlDiaEspecifico, token, date);
                console.log(`O ID específico é: ${idEspecifico2}.`);

                var idSBCWE = await obterIdsSbCW(idEspecifico2, token);
                var idSBCW = idSBCWE.map(setor => setor.id);
                var nomeSetor = idSBCWE.map(setor => setor.setor);

                var voosLinha = nomeSetor.map(() => []); // ✅ Agora nomeSetor já existe

                for (let i = 0; i < idSBCW.length; i++) {
                    console.log(`O ID SBCW é: ${idSBCW[i]}`);

                    var baseURLFinal = `https://sigma.decea.mil.br/sigma-api/v1/sessions/STRATEGICAL/${idEspecifico2}/regulatedElementOfSession/${idSBCW[i]}/flightIntentions`;

                    for (const intervalo of horarios) {
                        var url = `${baseURLFinal}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=FIFTEEN_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;

                        try {
                            var numeroDeVoos = await obterVoosIntervalo(url, token, intervalo);
                            console.log(`Data ${date}, intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);

                            horariosLinha.push(`${intervalo.begin} - ${intervalo.end}`);

                            if (!Array.isArray(voosLinha[i])) { // ✅ Garante que voosLinha[i] seja um array
                                voosLinha[i] = [];
                            }
                            voosLinha[i].push(numeroDeVoos);
                        } catch (err) {
                            console.error(`Erro no intervalo ${intervalo.begin} - ${intervalo.end}: ${err.message}`);
                        }
                    }

                    salvarComoCSV(nomeSetor, date, horariosLinha, voosLinha);
                    console.timeEnd(`Tempo para processar ${date}`);
                }
            } catch (err) {
                console.error(`Erro ao processar a data ${date}: ${err.message}`);
            }
        }
    } catch (error) {
        console.error('Erro na coleta de dados:', error.message);
    }
}

async function obterTodosDadosResposta(url, token) {
    try { 
        var resposta = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!resposta.ok) {
            throw new Error(`Erro ao obter ID da página de coleta das respostas - ${resposta.statusText}`);
        }

        var dados = await resposta.json();
        
        // Verifica se 'content' existe e não está vazio
        if (!dados.content || dados.content.length === 0) {
            throw new Error('Nenhum dado encontrado em content.');
        }

        // Mapeia todos os valores de beginDate
        var idsContent = dados.content.map(obj => obj.id);
        
        console.log(`Todos os Ids Content encontrados são:`, idsContent);

        // Retorna o ID do primeiro elemento encontrado (caso necessário)
        await new Promise(resolve => setTimeout(resolve, 1000));
        return dados.content[0]?.id || null;

    } catch (error) {
        console.error(`Erro ao tentar encontrar todos os elementos de resposta - erro ${error.message}`);
    }
}


// Função para obter o ID da página
async function obterIdPagina(url, token, date) {
    const [year, month, day] = date.split('-'); // Extraímos year, month e day a partir da string date
    try {
        var resposta = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!resposta.ok) {
            throw new Error(`Erro ao obter ID da página: ${resposta.statusText}`);
        }

        var dadosIdEspecifico = await resposta.json();
        var objetoData = dadosIdEspecifico.content.find((obj) => obj.beginDate === `${year}-${month}-${day}T03:00:00.000Z`);

        console.log(`O ano, mês e dia são: ${year}, ${month} e ${day}`);

        if (objetoData) {
            await new Promise (resolve => setTimeout(resolve, 1000));    
            return objetoData.id;
        } else {
            throw new Error('ID Específico não encontrado');
        }
    } catch (error) {
        console.error(`Erro ao encontrar o Id Específico - Erro: ${error.message}`);
    }
}


// Função para obter o ID SBCW
async function obterIdsSbCW(idEspecifico, token) {
    var idsEncontrados = [];

    for (let i = 1; i <= 18; i++) {
        let nomeSetor = `SBCW.CW${i.toString().padStart(2, '0')}`;
        let url = `https://sigma.decea.mil.br/sigma-api/v1/sessions/STRATEGICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=1&size=200&regulatedType=FIR_SECTOR&name=SBCW&sessionInterval=FIFTEEN_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`;

        try {
            var resposta = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                
            });

            if (!resposta.ok) {
                console.error(`Erro ao acessar URL: ${url} - Status: ${resposta.statusText}`);
                continue;
            }

            var dados = await resposta.json();
            var objetoSBCW = dados.content.find((obj) => obj.name === nomeSetor);
            console.log(`O nome do setor é: ${objetoSBCW?.name}`);

            if (objetoSBCW) {
                idsEncontrados.push({ setor: nomeSetor, id: objetoSBCW.id });
                console.log(`O ID do setor ${nomeSetor} é: ${objetoSBCW.id}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Erro ao buscar ID ${nomeSetor} na URL: ${url} - Erro: ${error.message}`);
        }
    }

    if (idsEncontrados.length === 0) {
        throw new Error('Nenhum ID SBCW encontrado.');
    }

    return idsEncontrados;
}


// Função para obter número de voos em um intervalo
async function obterVoosIntervalo(url, token, intervalo) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ Correção aplicada

    var resposta = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!resposta.ok) {
        throw new Error(`Erro na requisição do intervalo ${intervalo.begin} - ${intervalo.end}: ${resposta.statusText}`);
    }

    var dados = await resposta.json();
    return dados.totalElements || 0;
}


// Gerar intervalos de horários
function gerarHorarios() {
    const horarios = [];
    
    for (let hora = 0; hora < 24; hora++) {
        for (let minuto = 0; minuto < 60; minuto += 15) {
            const horaInicio = hora.toString().padStart(2, '0');
            const minutoInicio = minuto.toString().padStart(2, '0');

            let horaFim = hora;
            let minutoFim = minuto + 15;

            if (minutoFim === 60) {
                minutoFim = 0;
                horaFim = (hora + 1) % 24;
            }

            const horaFimStr = horaFim.toString().padStart(2, '0');
            const minutoFimStr = minutoFim.toString().padStart(2, '0');

            horarios.push({ begin: `${horaInicio}:${minutoInicio}`, end: `${horaFimStr}:${minutoFimStr}` });
        }
    }
    
    return horarios;
}

console.log(gerarHorarios());


// Gerar datas com links para URLs
function gerarDatasComLinks() {
    const links = [];
    const startDate = new Date('2025-02-06');
    const endDate = new Date('2025-02-12');

    while (startDate <= endDate) {
        const year = startDate.getFullYear();
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');

        const url = `https://sigma.decea.mil.br/sigma-api/v1/sessions/STRATEGICAL?page=1&size=8&sortActive=beginDate&sortDirection=desc&sessionType=STRATEGICAL&beginDate=${year}-${month}-${day}T03:00:00.000Z`;

        links.push({ date: `${year}-${month}-${day}`, urlDiaEspecifico: url });
        startDate.setDate(startDate.getDate() + 1);
    }

    return links;
}

// Salvar como CSV

function salvarComoCSV(nomeSetor, date, horariosLinha, voosLinha) {
    // Garantindo que voosLinha é um array de arrays
    if (!Array.isArray(voosLinha) || !voosLinha.every(Array.isArray)) {
        console.error("Erro: voosLinha deve ser um array de arrays!");
        return;
    }

    // Formatar a data para o formato desejado
    const dataFormatada = `${date.split('-')[2]}/${date.split('-')[1]}/${date.split('-')[0]}`;

    // Criando a primeira linha do CSV com a data e os horários
    let csvContent = `Setor\tData\t${horariosLinha.join('\t')}\n`;

    // Adicionando os dados de cada setor
    for (let i = 0; i < 18; i++) {
        let setorVoos = nomeSetor[i] + '\t' + dataFormatada + '\t'; // Setor e Data
        let voosPorSetor = Array.isArray(voosLinha[i]) ? voosLinha[i].join('\t') : voosLinha[i]; // Garantir que é uma string
        csvContent += setorVoos + voosPorSetor + '\n';
    }

    // Salvar o arquivo CSV
    const fileName = `${nomeSetor[0]} - dados_demandas_${date}.csv`;
    fs.writeFileSync(fileName, csvContent, 'utf8');
    console.log(`Arquivo CSV salvo como "${fileName}"`);
}



// Executar a função principal

coletarDadosDemandas();