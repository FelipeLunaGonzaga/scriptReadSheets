const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // Inicia o Puppeteer com o navegador, especificando o caminho do Chrome se necessário
    const browser = await puppeteer.launch({
        headless: false, // Modo visível para ver a interação
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'  // Substitua pelo caminho correto do seu Chrome
    });

    const page = await browser.newPage();

    // Passo 1: Acesse a página de login da Shopee
    const loginUrl = 'https://shopee.com.br/buyer/login'; // URL da página de login
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });

    // Passo 2: Capturar o token CSRF ou qualquer outro dado necessário para login
    const csrfToken = await page.evaluate(() => {
        // Encontre o token CSRF se estiver disponível
        const token = document.querySelector('input[name="csrf_token"]');
        return token ? token.value : null;
    });

    console.log('CSRF Token:', csrfToken); // Verifique o CSRF Token

    // Passo 3: Preencha os dados de login
    await page.type('input[name="loginKey"]', 'felipe565@gmail.com'); // Substitua pelo seu login
    await page.type('input[name="password"]', '01I@mmanm'); // Substitua pela sua senha

    // Envia o formulário de login
    await page.click('button.b5aVaf.PVSuiZ.Gqupku.qz7ctP.qxS7lQ.Q4KP5g');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Passo 4: Após o login bem-sucedido, acesse a página do produto
    const productUrl = 'https://s.shopee.com.br/2Vbc5gOPcj'; // Substitua pela URL do produto
    await page.goto(productUrl, { waitUntil: 'networkidle2' });

    // Passo 5: Coleta as informações do produto
    const productData = await page.evaluate(() => {
        const title = document.querySelector('h1') ? document.querySelector('h1').innerText : null;
        const price = document.querySelector('.price') ? document.querySelector('.price').innerText : null;
        const imageUrl = document.querySelector('.product-image') ? document.querySelector('.product-image').src : null;

        return { title, price, imageUrl };
    });

    console.log('Dados do produto:', productData);

    // Fecha o navegador
    await browser.close();
})();
