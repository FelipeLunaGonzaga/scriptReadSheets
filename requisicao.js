const fs = require('fs');

// Função principal para iniciar as requisições
async function coletarDadosDemandas() {
    const token = '2eeb862b-65a6-4dc1-9d9e-a3309dc053aa'; // Token fornecido
    const baseURL = 'https://sigma.decea.mil.br/sigma-api/v1/sessions/MANUAL/17482/regulatedElementOfSession/6277295/flightIntentions';
    const horarios = gerarHorarios(); // Gera todos os intervalos de 30 minutos entre 00:00 e 23:30 UTC
    const horariosLinha = []; // Array para armazenar os horários para a primeira linha
    const voosLinha = []; // Array para armazenar o número de voos para a segunda linha

    // Itera sobre cada intervalo e faz uma requisição para cada
    for (const intervalo of horarios) {
        const url = `${baseURL}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=THIRTY_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;
        
        try {
            // Faz a requisição para o intervalo específico
            const resposta = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Checa se a requisição foi bem-sucedida
            if (!resposta.ok) {
                console.error(`Erro na requisição para o intervalo ${intervalo.begin} - ${intervalo.end}:`, resposta.statusText);
                continue;
            }

            // Extrai os dados JSON da resposta
            const dados = await resposta.json();
            
            // Extrai o número de voos usando o campo 'totalElements'
            const numeroDeVoos = dados.totalElements || 0;
            console.log(`Intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);
            
            // Adiciona o horário e o número de voos às respectivas linhas para o CSV
            horariosLinha.push(`${intervalo.begin} - ${intervalo.end}`);
            voosLinha.push(numeroDeVoos);

        } catch (err) {
            console.error(`Erro de processamento no intervalo ${intervalo.begin} - ${intervalo.end}:`, err);
        }
    }
    
    // Gera e salva o CSV após a coleta de todos os dados
    salvarComoCSV(horariosLinha, voosLinha);
}

// Função auxiliar para gerar os horários entre 00:00 e 23:30 com intervalos de 30 minutos
function gerarHorarios() {
    const horarios = [];
    for (let hora = 0; hora < 24; hora++) {
        const horaStr = hora.toString().padStart(2, '0');
        const proximaHoraStr = ((hora + 1) % 24).toString().padStart(2, '0'); // Corrigido para 24 horas
        horarios.push({ begin: `${horaStr}:00`, end: `${horaStr}:30` });
        horarios.push({ begin: `${horaStr}:30`, end: `${proximaHoraStr}:00` });
    }
    return horarios;
}

// Função para salvar os dados em um arquivo CSV
function salvarComoCSV(horariosLinha, voosLinha) {
    // Estrutura do CSV: primeira linha com horários, segunda linha com números de voos
    const csvContent = horariosLinha.join(',') + '\n' + voosLinha.join(',');
    
    // Escreve o conteúdo do CSV em um arquivo
    fs.writeFileSync('dados_demandas.csv', csvContent, 'utf8');
    console.log('Arquivo CSV salvo como "dados_demandas.csv"');
}

// Chama a função principal
coletarDadosDemandas();
