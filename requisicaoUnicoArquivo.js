const fs = require('fs');

// Função principal
async function coletarDadosDemandas() {
    const token = '93810690-c097-45a1-8a9a-e4b71c05998c';
    const urlsPorDia = gerarDatasComLinks();
    const horarios = gerarHorarios();

    // Verifica se o arquivo já existe e adiciona cabeçalho apenas uma vez
    if (!fs.existsSync('dados_demandas.csv')) {
        const header = horarios.map(h => `${h.begin} - ${h.end}`).join(',');
        fs.writeFileSync('dados_demandas.csv', header + '\n', 'utf8');
    }

    for (const { date, urlDiaEspecifico } of urlsPorDia) {
        const voosLinha = [];

        try {
            console.log(`Processando data: ${date}`);
            console.time(`Tempo para processar ${date}`);

            // Passo 1: Obter o ID da página
            const idEspecifico2 = await obterIdPagina(urlDiaEspecifico, token);

            console.log(`O id especifico é: ${idEspecifico2}`);

            // Passo 2: Obter o ID SBRE
            const idSBRE = await obterIdSbre(idEspecifico2, token);

            console.log(`O id da página para SBRE é: ${idSBRE}`);

            const baseURLFinal = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico2}/regulatedElementOfSession/${idSBRE}/flightIntentions`;

            // Passo 3: Requisição por intervalos
            for (const intervalo of horarios) {
                const url = `${baseURLFinal}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=THIRTY_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;

                try {
                    const numeroDeVoos = await obterVoosIntervalo(url, token, intervalo);
                    console.log(`Data ${date}, intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);
                    voosLinha.push(numeroDeVoos);
                } catch (err) {
                    console.error(`Erro no intervalo ${intervalo.begin} - ${intervalo.end}: ${err.message}`);
                    voosLinha.push(0); // Adiciona 0 em caso de erro
                }
            }

            // Salva os dados do dia no CSV
            salvarDadosDia(date, voosLinha);
            console.timeEnd(`Tempo para processar ${date}`);
        } catch (err) {
            console.error(`Erro ao processar a data ${date}: ${err.message}`);
        }
    }
}

// Função para salvar os dados de um dia no CSV
function salvarDadosDia(date, voosLinha) {
    const linha = voosLinha.join(',');
    fs.appendFileSync('dados_demandas.csv', linha + '\n', 'utf8');
    console.log(`Dados do dia ${date} salvos no arquivo.`);
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
    const urls = [
        `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=1&size=8&regulatedType=FIR_SECTOR_GROUP&name=SBRE&sessionInterval=THIRTY_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`,
        `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=2&size=8&regulatedType=FIR_SECTOR_GROUP&name=SBRE&sessionInterval=THIRTY_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`
    ];

    for (const url of urls) {
        try {
            const resposta = await fetch(url, {
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

            const dados = await resposta.json();
            const objetoSBRE = dados.content.find((obj) => obj.name === "SBRE");

            if (objetoSBRE) {
                return objetoSBRE.id;
            }
        } catch (error) {
            console.error(`Erro ao buscar ID SBRE na URL: ${url} - Erro: ${error.message}`);
        }
    }

    throw new Error('ID SBRE não encontrado em nenhuma das páginas.');
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
    const startDate = new Date('2024-12-29');
    const endDate = new Date('2025-01-01');

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
