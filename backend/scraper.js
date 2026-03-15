const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeLeads(niche, city) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const query = `${niche} em ${city}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;

    await page.goto(url, { waitUntil: 'load', timeout: 60000 });

    const leads = [];

    try {
        // Aguarda a lista de resultados carregar (se no achar, retorna vazio)
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

        // Scroll para carregar mais resultados (ex: buscar at 20)
        await page.evaluate(async () => {
            const wrapper = document.querySelector('div[role="feed"]');
            if (wrapper) {
                for (let i = 0; i < 5; i++) {
                    wrapper.scrollBy(0, wrapper.scrollHeight);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }
        });

        // Extrai dados usando o eval
        // O XPath ou QuerySelect do Google Maps muda, mas geralmente links com "hfpxzc" so os cards de lugares
        const items = await page.$$eval('a.hfpxzc', nodes => {
            return nodes.map(n => n.href);
        });

        console.log(`Encontrados ${items.length} links, processando os dados (simulacao/extracao superficial)...`);

        // Uma extrao mais completa:
        const extracted = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.Nv2PK'));
            return cards.map(c => {
                const nameNode = c.querySelector('.qBF1Pd');
                // Tenta achar spans com numero de telefone q comece com "+55" ou similar
                // Como o nome da classe eh dinamico, podemos pegar o texto innerText de divs contendo numeros
                const textNodes = Array.from(c.querySelectorAll('.W4Efsd'));
                let phoneNode = textNodes.find(t => /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(t.innerText));

                return {
                    name: nameNode ? nameNode.innerText : null,
                    rawPhone: phoneNode ? phoneNode.innerText.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/)[0] : null
                };
            }).filter(i => i.name && i.rawPhone);
        });

        // Validao e Limpeza
        extracted.forEach(item => {
            if (item.name && item.rawPhone) {
                leads.push({
                    name: item.name,
                    phone: item.rawPhone,
                    city: city
                });
            }
        });

        // Dedup limit just for safety (if multiple elements found the same place)
        const uniqueLeads = Array.from(new Set(leads.map(a => a.phone)))
            .map(phone => leads.find(a => a.phone === phone));

        await browser.close();

        return uniqueLeads;
    } catch (e) {
        console.error("Erro no scraper do Google Maps:", e);
        await browser.close();
        return [];
    }
}

module.exports = { scrapeLeads };
