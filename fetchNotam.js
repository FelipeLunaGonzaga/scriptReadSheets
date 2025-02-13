import puppeteer from 'puppeteer';

async function fetchNotamData() {
    try {
        // Inicializa o Puppeteer e abre o navegador
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Acessa a página
        await page.goto('https://aisweb.decea.mil.br/?i=notam', {
            waitUntil: 'domcontentloaded'
        });

        // Preenche o campo de pesquisa com "SBNT"
        await page.type('input[name="icaocode"]', 'SBNT'); 
        
        // Clica no botão de pesquisa
        await page.click('input[type="submit"]'); 

        // Aumentando o tempo de espera para 60 segundos
        await page.waitForSelector('div.notam', { timeout: 60000 }); // Espera o conteúdo ser carregado

        // Extrai o conteúdo das divs com a classe 'notam'
        const notamContent = await page.evaluate(() => {
            const notams = [];
            const notamDivs = document.querySelectorAll('div.notam');
            notamDivs.forEach(div => {
                notams.push(div.innerText.trim());
            });
            return notams;
        });

        // Exibe os resultados encontrados
        if (notamContent.length === 0) {
            console.log("Nenhum NOTAM encontrado.");
        } else {
            notamContent.forEach(content => {
                console.log('NOTAM encontrado:', content);
            });
        }

        // Fecha o navegador
        await browser.close();
    } catch (error) {
        console.error('Erro ao fazer a requisição:', error);
    }
}

fetchNotamData();
