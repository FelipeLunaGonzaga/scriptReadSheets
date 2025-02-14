import axios from 'axios';

const urlAppScript = 'https://script.google.com/macros/s/AKfycbxNyecQ59iiSjPS8ioaNQU3gypE4gyMZuhmHZQ_hkxprO6m3-ucL-CHFX-eCFs1Wx-2/exec'; // 🔄 Substitua pelo link correto do Apps Script

async function enviarTeste() {
    try {
        const resposta = await axios.post(urlAppScript, {
            mensagem: "Teste de envio do Node.js 🚀"
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000 // ⏳ Define 15 segundos para evitar timeout
        });

        console.log(`✅ Resposta do App Script: ${resposta.data}`);

        // Aguarda 2 segundos antes de continuar (evita sobrecarga)
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.error(`❌ Erro ao enviar os dados: ${error.message}`);
    }
}

// Executa a função com um intervalo
(async () => {
    for (let i = 0; i < 5; i++) { // 🔄 Simula 5 envios espaçados
        await enviarTeste();
    }
})();
