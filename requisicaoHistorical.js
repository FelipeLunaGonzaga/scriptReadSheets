import puppeteer from 'puppeteer-core';
import fs from 'fs';
import axios from 'axios';
import { resolve } from 'path';

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

        // Promessa para capturar o token
        const tokenCaptured = new Promise((resolve, reject) => {
            page.on('request', (request) => {
                const headers = request.headers();
                if (headers['authorization'] && headers['authorization'].startsWith('Bearer ')) {
                    bearerToken = headers['authorization'].replace('Bearer ', '');
                    resolve(bearerToken);
                }
            });
        });

        console.log('Acessando página de login...');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

        await page.waitForSelector('input[placeholder="Digite a senha cadastrada"]', { timeout: 10000 });

        console.log('Preenchendo e-mail...');
        await page.type('input[placeholder="Digite o nome de usuário cadastrado"]', email, { delay: 100 });

        console.log('Preenchendo senha...');
        await page.type('input[placeholder="Digite a senha cadastrada"]', password, { delay: 100 });

        console.log('Realizando login...');
        await Promise.all([
            page.click('button.v-button.submit[data-test="login-submit-button"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
        ]);

        console.log('Login realizado. Aguardando captura do token...');
        await tokenCaptured; // Aguarda o token ser capturado

        if (bearerToken) {
            console.log('Bearer Token capturado:', bearerToken);
        } else {
            throw new Error('Bearer não encontrado nos cabeçalhos das requisições.');
        }

        //await browser.close();
        return bearerToken;
    } catch (error) {
        console.error('Erro ao coletar Bearer ou realizar a tarefa:', error);
        // if (browser) await browser.close();
    }
}

// Função principal
async function coletarDadosDemandas() {
    try {
        // Garante que o token será coletado antes de prosseguir
        const token = '15d0449d-5402-4b50-99f2-7f0b0c7805ed ';

        console.log('Token coletado:', token);

        const urlsPorDia = gerarDatasComLinks();
        const horarios = gerarHorarios();

        for (const { date, urlDiaEspecifico } of urlsPorDia) {
            var horariosLinha = [];
            var voosLinha = [];

            try {
                console.log(`Processando data: ${date}`);
                console.time(`Tempo para processar ${date}`);

                var idEspecifico2 = await obterIdPagina(urlDiaEspecifico, token);
                console.log(`O ID específico é: ${idEspecifico2}.`);

                var idSBRE = await obterIdSbre(idEspecifico2, token);
                console.log(`O ID SBRE é: ${idSBRE}`);

                var baseURLFinal = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico2}/regulatedElementOfSession/${idSBRE}/flightIntentions`;

                for (const intervalo of horarios) {
                    var url = `${baseURLFinal}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=THIRTY_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;

                    try {
                        var numeroDeVoos = await obterVoosIntervalo(url, token, intervalo);
                        console.log(`Data ${date}, intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);

                        horariosLinha.push(`${intervalo.begin} - ${intervalo.end}`);
                        voosLinha.push(numeroDeVoos);
                    } catch (err) {
                        console.error(`Erro no intervalo ${intervalo.begin} - ${intervalo.end}: ${err.message}`);
                    }
                }

                await sendToAppScript(horariosLinha, voosLinha);

                salvarComoCSV(date, horariosLinha, voosLinha);
                console.timeEnd(`Tempo para processar ${date}`);
            } catch (err) {
                console.error(`Erro ao processar a data ${date}: ${err.message}`);
            }
        }
    } catch (error) {
        console.error('Erro na coleta de dados:', error.message);
    }
}

async function sendToAppScript(horariosLinha, voosLinha) {
    const urlAppScript = 'https://script.google.com/macros/s/AKfycbwfQ8pwrOYXSrW7dkB6-xbkUQ6uMKbvARPLq6O9RY5AJ6ipb_U_fXQZM0IoyGQRxoHx/exec';

    try {
        const csvContent = [
            horariosLinha.join(','),
            voosLinha.join(',')
        ].join('\n');

        console.log("📡 Enviando dados para o Apps Script...");

        const resposta = await axios.post(urlAppScript, { 
            csvContent: csvContent
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 // 30 segundos
        });

        console.log(`✅ Dados enviados para o AppScript - Resposta: ${resposta.data}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar os dados para o AppScript: ${error.message}`);
    }
}
// Função para obter o ID da página
async function obterIdPagina(url, token) {
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

    var dados = await resposta.json();
    return dados.content && dados.content.length > 0 ? dados.content[0].id : null;
}

// Função para obter o ID SBRE
async function obterIdSbre(idEspecifico, token) {
    var urls = [
        `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=1&size=100&regulatedType=FIR_SECTOR_GROUP&name=SBRE&sessionInterval=THIRTY_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`,
        `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/${idEspecifico}/regulatedElementOfSession/dashboard?page=2&size=8&regulatedType=FIR_SECTOR_GROUP&name=SBRE&sessionInterval=THIRTY_MINUTES&fullSearch=false&status=NORMAL,CONGESTION,SATURATION&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE`
    ];

    for (var url of urls) {
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
            var objetoSBRE = dados.content.find((obj) => obj.name === "SBRE");

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

    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    const startDate = new Date('2025-02-14');
    const endDate = new Date('2025-02-15');

    while (startDate <= endDate) {
        const year = startDate.getFullYear();
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');

        const url = `https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL?page=1&size=8&sortActive=beginDate&sortDirection=desc&sessionType=HISTORICAL&beginDate=${year}-${month}-${day}T03:00:00.000Z`;

        links.push({ date: `${year}-${month}-${day}`, urlDiaEspecifico: url });
        startDate.setDate(startDate.getDate() + 1);
    }

    return links;
}

// Salvar como CSV
function salvarComoCSV(date, horariosLinha, voosLinha) {
    const csvContent = [
        horariosLinha.join(','),
        voosLinha.join(',')
    ].join('\n');

    fs.writeFileSync(`dados_demandas_${date}.csv`, csvContent, 'utf8');
    console.log(`Arquivo CSV salvo como "dados_demandas_${date}.csv"`);
}

// Executar a função principal
coletarDadosDemandas();