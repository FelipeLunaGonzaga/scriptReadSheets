const fs = require('fs');

// Função principal para iniciar as requisições
async function coletarDadosDemandas() {
<<<<<<< HEAD
    const token = '610ea4d8-894a-4e4a-9423-a874158fbd1b'; 
    const baseURL = 'https://sigma.decea.mil.br/sigma-api/v1/sessions/HISTORICAL/58393/regulatedElementOfSession/2846911/flightIntentions';
    const horarios = gerarHorarios(); // de 30 minutos entre 00:00 e 23:30 UTC
    const horariosLinha = []; // horários para a primeira linha
    const voosLinha = []; // número de voos para a segunda linha
=======
    const token = '2eeb862b-65a6-4dc1-9d9e-a3309dc053aa'; // Token fornecido
    const baseURL = 'https://sigma.decea.mil.br/sigma-api/v1/sessions/MANUAL/17482/regulatedElementOfSession/6277295/flightIntentions';
    const horarios = gerarHorarios(); // Gera todos os intervalos de 30 minutos entre 00:00 e 23:30 UTC
    const horariosLinha = []; // Array para armazenar os horários para a primeira linha
    const voosLinha = []; // Array para armazenar o número de voos para a segunda linha
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214

    // Itera sobre cada intervalo e faz uma requisição para cada
    for (const intervalo of horarios) {
        const url = `${baseURL}?page=1&size=10&capacityType=declared&operationTypeDemandChart=TOTAL&sessionInterval=THIRTY_MINUTES&beginTime=${intervalo.begin}&endTime=${intervalo.end}&levelGE=F150&narrowSearch=false&flightIntentionTypes=RPL_INSTANCE,FPL_INSTANCE,HOTRAN_INSTANCE&flightPlanStates=ONGOING_TER`;
        
        try {
<<<<<<< HEAD
            //  intervalo específico
=======
            // Faz a requisição para o intervalo específico
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
            const resposta = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
<<<<<<< HEAD
            // Checa a requisição 
=======
            // Checa se a requisição foi bem-sucedida
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
            if (!resposta.ok) {
                console.error(`Erro na requisição para o intervalo ${intervalo.begin} - ${intervalo.end}:`, resposta.statusText);
                continue;
            }

<<<<<<< HEAD
            
            const dados = await resposta.json();
            
           
            const numeroDeVoos = dados.totalElements || 0;
            console.log(`Intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);
            
         
=======
            // Extrai os dados JSON da resposta
            const dados = await resposta.json();
            
            // Extrai o número de voos usando o campo 'totalElements'
            const numeroDeVoos = dados.totalElements || 0;
            console.log(`Intervalo ${intervalo.begin} - ${intervalo.end}: ${numeroDeVoos} voos`);
            
            // Adiciona o horário e o número de voos às respectivas linhas para o CSV
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
            horariosLinha.push(`${intervalo.begin} - ${intervalo.end}`);
            voosLinha.push(numeroDeVoos);

        } catch (err) {
            console.error(`Erro de processamento no intervalo ${intervalo.begin} - ${intervalo.end}:`, err);
        }
    }
    
<<<<<<< HEAD
   
    salvarComoCSV(horariosLinha, voosLinha);
}


=======
    // Gera e salva o CSV após a coleta de todos os dados
    salvarComoCSV(horariosLinha, voosLinha);
}

// Função auxiliar para gerar os horários entre 00:00 e 23:30 com intervalos de 30 minutos
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
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

<<<<<<< HEAD
function salvarComoCSV(horariosLinha, voosLinha) {

    const csvContent = horariosLinha.join(',') + '\n' + voosLinha.join(',');
    
    
=======
// Função para salvar os dados em um arquivo CSV
function salvarComoCSV(horariosLinha, voosLinha) {
    // Estrutura do CSV: primeira linha com horários, segunda linha com números de voos
    const csvContent = horariosLinha.join(',') + '\n' + voosLinha.join(',');
    
    // Escreve o conteúdo do CSV em um arquivo
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
    fs.writeFileSync('dados_demandas.csv', csvContent, 'utf8');
    console.log('Arquivo CSV salvo como "dados_demandas.csv"');
}

<<<<<<< HEAD

coletarDadosDemandas();
=======
// Chama a função principal
coletarDadosDemandas();
>>>>>>> 08f380bdd86880b5ce52e0e70e3b1315110b7214
