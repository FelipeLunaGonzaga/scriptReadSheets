
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const BOT_TOKEN = process.env.BOT_TOKEN || '7941947005:AAGMnL7pvm99z6zJw56KgiqEQd319MQJroA';
const bot = new Telegraf(BOT_TOKEN);

const usersDBPath = './users.json';
const frameUrl = 'https://i.ibb.co/sP0bZzS/STORY-PROMO-O.jpg'; // URL da moldura pré-formatada


if (!fs.existsSync(usersDBPath)) {
    fs.writeFileSync(usersDBPath, JSON.stringify({}));
}

function saveUserData(userId, data) {
    const users = JSON.parse(fs.readFileSync(usersDBPath));
    users[userId] = { ...users[userId], ...data };
    fs.writeFileSync(usersDBPath, JSON.stringify(users, null, 2));
}

function getUserData(userId) {
    const users = JSON.parse(fs.readFileSync(usersDBPath));
    return users[userId] || {};
}

const userStates = {};

bot.start((ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const userName = ctx.from.first_name;

    if (!userData.name) {
        saveUserData(userId, { name: userName});
    }

    if (!userData.appId) {
        userStates[userId] = 'waitingAppId';
        ctx.reply(`Olá, ${userName}! Eu sou o seu robô do Afiliados Pro! \u{1F916} Seja muito bem vindo(a).
            
Para começar, é preciso que você envie seu AppId da Shopee para registrá-lo em nosso Banco de Dados...`);

    } else if (!userData.appSecret) {
        userStates[userId] = 'waitingAppSecret';
        ctx.reply('Agora, envie seu AppSecret \u{1F511} da Shopee para continuarmos o processo...');
    } else {
        ctx.reply(`Bem-vindo(a) de volta, ${userName}! Envie o link encurtado do produto da Shopee para começar, no formato do exemplo abaixo:
"https://s.shopee.com.br/2qEjJKzRfF"`);
    }
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const userName = ctx.from.first_name;

    if (userStates[userId] === 'waitingAppId') {
        if (text.length !== 11) {
            ctx.reply(`⚠️ ${userName}, o seu AppId ${text} parece estar incorreto (são previstos 11 caracteres). Confira-o e insira novamente.`);
            return;
        }
        saveUserData(userId, { appId: text });
        userStates[userId] = 'waitingAppSecret';
        ctx.reply('AppId salvo com sucesso! Agora, envie seu AppSecret \u{1F511} da Shopee para continuarmos o processo...');
    } else if (userStates[userId] === 'waitingAppSecret') {
        if (text.length !== 32) {
            ctx.reply(`O seu App Secret ${text} parece estar incorreto (o tamanho padrão do App Secret são de 32 caracteres). Insira-o novamente.`);
            return;
        }
        saveUserData(userId, { appSecret: text });
        delete userStates[userId];
        ctx.reply('AppSecret salvo com sucesso! Agora, envie o seu primeiro link encurtado do produto Shopee para eu poder te enviar a imagem.\nEle precisa ser do tipo do formato abaixo:\n"https://s.shopee.com.br/2qEjJKzRfF"');
    } else {
        const offerLinkRegex = /https:\/\/s\.shopee\.com\.br\/[a-zA-Z0-9]+/;
        if (offerLinkRegex.test(text)) {
            console.log(`OfferLink detectado: ${text}`);
            await processOfferLink(ctx, userId, text);
        } else {
            console.log('Link inválido detectado:', text);
            ctx.reply(`O link do produto não está no formato esperado, ${userName}. Por favor, envie o link do produto no formato do exemplo abaixo:
https://s.shopee.com.br/2qEjJKzRfF`);
        }
    }
});

async function processOfferLink(ctx, userId, offerLink) {
    try {
        ctx.reply('Buscando os dados do produto... \u{1F55C}');
        const expandedUrl = await expandShortLink(offerLink);
        console.log(`URL expandido: ${expandedUrl}`);

        const match = expandedUrl.match(/\/product\/(\d+)\/(\d+)/);
        if (match) {
            const shopId = match[1];
            const itemId = match[2];
            console.log(`IDs extraídos - shopId: ${shopId}, itemId: ${itemId}`);
            await handleProductRequest(ctx, userId, shopId, itemId);
        } else {
            ctx.reply('Não foi possível extrair os IDs do link. Verifique o link e tente novamente. Lembre-se que ele precisa ser no mesmo formato do exemplo abaixo:\nhttps://s.shopee.com.br/2qEjJKzRfF');
        }
    } catch (error) {
        console.error('Erro ao expandir o link:', error.message);
        ctx.reply('Ocorreu um erro ao processar o link encurtado. Tente novamente.');
    }
}

async function expandShortLink(shortUrl) {
    const response = await axios.get(shortUrl, { maxRedirects: 0, validateStatus: (status) => status === 301 });
    const location = response.headers.location;
    if (!location) {
        throw new Error('Redirecionamento falhou.');
    }
    return location;
}

async function handleProductRequest(ctx, userId, shopId, itemId) {
    const userData = getUserData(userId);

    if (!userData.appId || !userData.appSecret) {
        return ctx.reply('Você precisa configurar seu AppId e AppSecret antes de enviar o link do produto. \u{1F917}	');
    }

    const payload = {
        query: `
            query getProductOfferList($shopId: Int64, $itemId: Int64) {
                productOfferV2(shopId: $shopId, itemId: $itemId) {
                    nodes {
                        productName
                        imageUrl
                        price                        
                        priceDiscountRate                        
                        offerLink
                        sales
                    }
                }
            }
        `,
        operationName: 'getProductOfferList',
        variables: {
            shopId: shopId,
            itemId: itemId,
        },
    };


    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signatureBase = `${userData.appId}${timestamp}${payloadString}${userData.appSecret}`;
    const signature = crypto.createHash('sha256').update(signatureBase).digest('hex');

    const headers = {
        Authorization: `SHA256 Credential=${userData.appId}, Timestamp=${timestamp}, Signature=${signature}`,
        'Content-Type': 'application/json',
    };

    try {
        ctx.reply('Produzindo o seu Post! \u{1F389} \u{1F5BC}\nAguarde alguns segundos... ');
        const response = await axios.post('https://open-api.affiliate.shopee.com.br/graphql', payload, { headers });

        if (response.data.data && response.data.data.productOfferV2) {
            const product = response.data.data.productOfferV2.nodes[0];

            const framePath = await createProductFrame(
                product.productName,
                product.imageUrl,
                product.price,
                product.priceDiscountRate,
                product.sales
            );

            if (fs.existsSync(framePath)) {
                await ctx.replyWithPhoto(
                    { source: framePath },
                    { caption: `Confira o link do produto:
[${product.offerLink}](${product.offerLink})

Faltam poucas horas para encerrar a promoção.`, parse_mode: 'Markdown' }
                );
                fs.unlinkSync(framePath);
            } else {
                console.error(`Erro: Arquivo ${framePath} não foi encontrado.`);
                ctx.reply('Ocorreu um erro ao criar a imagem do produto. Tente novamente.');
            }
        } else {
            ctx.reply('Nenhum dado encontrado ou erro na resposta.');
            console.log('Resposta da API:', response.data);
        }
    } catch (error) {
        console.error('Erro na requisição:', error.response?.data || error.message);
        ctx.reply('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
    }
}

async function createProductFrame(productName, imageUrl, price, priceDiscountRate, sales) {
    const frameImage = await loadImage(frameUrl); // Carrega a moldura diretamente da URL
    const canvas = createCanvas(frameImage.width, frameImage.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(frameImage, 0, 0); // Desenha a moldura no canvas

    // Dimensões da área branca para posicionamento
    const whiteArea = { x: 100, y: 150, width: 860, height: 860 }; // Dimensões com base na moldura

    // Carrega e redimensiona a imagem do produto
    const productImage = await loadImage(imageUrl);
    const productImageHeight = whiteArea.height * 0.9; // Ocupa 100% da área branca
    const productImageWidth = (productImage.width / productImage.height) * productImageHeight;
    const productImageX = whiteArea.x + (whiteArea.width - productImageWidth) / 2; // Centraliza horizontalmenteconst productImageAdjustedX = productImageX + 10; // Ajuste adicional de 10px para a direita

    const productImageY = whiteArea.y + 230; // ajuste vertical para baixo
    ctx.drawImage(productImage, productImageX, productImageY, productImageWidth, productImageHeight);

// Função para desenhar retângulos com cantos arredondados
function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = fillStyle;
    ctx.fill();
}

// Número de vendas "sales"

const salesY = whiteArea.y + 200;
const salesX = whiteArea.x + whiteArea.width / 2;
ctx.font = '30px Arial';
ctx.fillStyle = '#000000';
ctx.textAlign = 'center';
ctx.fillText(`${sales} já vendidos!`, salesX, salesY);

// Adiciona o título do produto
const productNameWidth = productName.length;
console.log(`Tamanho do nome é ${productNameWidth}`);
var px = null; var pxY = null;

if (productNameWidth < 55) {px = 70; pxY = 30} else { px = 50; pxY = 10 }

console.log(` O px é de ${px}`);

const titleY = productImageY + productImageHeight + 40; // 30px abaixo da imagem
ctx.font = `bold ${px}px Arial`;
ctx.fillStyle = '#000000';
ctx.textAlign = 'left'; // Alinha à esquerda
wrapText(ctx, productName, whiteArea.x, titleY, whiteArea.width - 20, 40 + pxY); // x começa no início da área branca


// Adiciona o preço abaixo da área branca
ctx.font = 'bold 70px Arial';
ctx.textAlign = 'center';
const priceText = `Preço: R$ ${price}`;
const priceX = whiteArea.x + whiteArea.width / 2; // Centraliza horizontalmente
const priceY = whiteArea.y + whiteArea.height + 400; // Posição vertical do preço

// Medir o tamanho do texto do preço
const textWidth = ctx.measureText(priceText).width;
const textHeight = 70; // Altura do fundo (aproximada com base na fonte)
const padding = 10; // Padding ao redor do texto
const borderRadius = 20; // Raio dos cantos arredondados

// Desenhar o fundo do texto com bordas arredondadas
drawRoundedRect(
    ctx,
    priceX - textWidth / 2 - padding, // X inicial do fundo
    priceY - textHeight + 20 - padding, // Y inicial do fundo
    textWidth + 2 * padding, // Largura do fundo com padding
    textHeight + 2 * padding, // Altura do fundo com padding
    borderRadius, // Raio das bordas arredondadas
    '#000000' // Cor do fundo
);

// Adicionar o texto do preço
ctx.fillStyle = '#FFFFFF'; // Cor do texto branca
ctx.fillText(priceText, priceX, priceY);

// Adiciona o texto abaixo do PREÇO com priceDiscountRate


ctx.font = 'bold 55px Arial'; // Fonte menor que o título
const priceDiscountRateX = priceX;
const priceDiscountRateY = priceY + 100;

// Tamanho do priceDiscountRate
const priceDiscountRateText = `${priceDiscountRate}% OFF!`;
const priceDiscountRateWidth = ctx.measureText(priceDiscountRateText).width;
const priceDiscountRateHeight = 65;
const padding1 = 10;
const borderRadius1 = 10;

drawRoundedRect(
    ctx,
    priceDiscountRateX - priceDiscountRateWidth / 2 - padding1, // Ajusta X para centralizar
    priceDiscountRateY - priceDiscountRateHeight / 2 - padding1 - 10, // Ajusta Y para centralizar
    priceDiscountRateWidth + 2 * padding1, // Largura total
    priceDiscountRateHeight + 2 * padding1, // Altura total
    borderRadius1, // Raio dos cantos arredondados
    '#Ff7f2a' // Cor do fundo
);

ctx.fillStyle = '#FFFFFF'; 
ctx.fillText(`${priceDiscountRate}% OFF!`, priceDiscountRateX, priceDiscountRateY);




    const outputPath = `./product_${Date.now()}.png`; // Define o caminho de saída

    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });

    return outputPath; // Retorna o caminho da imagem gerada
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth) {
            ctx.fillText(line, x, y);
            line = word + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}



bot.launch();
console.log('Bot está online!');
