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

        // Scroll para carregar mais resultados iterando até o final
        await page.evaluate(async () => {
            const wrapper = document.querySelector('div[role="feed"]');
            if (wrapper) {
                let lastHeight = 0;
                let attempts = 0;
                while (attempts < 20) { // Ate 20 scrolls longos para mais leads
                    wrapper.scrollBy(0, wrapper.scrollHeight);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    if (wrapper.scrollHeight === lastHeight) {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                        if (wrapper.scrollHeight === lastHeight) break;
                    }
                    lastHeight = wrapper.scrollHeight;
                    attempts++;
                }
            }
        });

        // Extrai dados
        const items = await page.$$eval('a.hfpxzc', nodes => {
            return nodes.map(n => n.href);
        });

        console.log(`Encontrados ${items.length} locais... extraindo dados profundos.`);

        const extracted = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.Nv2PK'));
            return cards.map(c => {
                const nameNode = c.querySelector('.qBF1Pd');

                const textNodes = Array.from(c.querySelectorAll('.W4Efsd'));
                let phoneText = textNodes.find(t => /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(t.innerText));

                let waLink = c.querySelector('a[href*="wa.me/"]');
                let rawPhone = null;

                if (phoneText) {
                    rawPhone = phoneText.innerText.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/)[0];
                } else if (waLink) {
                    const match = waLink.href.match(/wa\.me\/[+]*(\d+)/);
                    if (match) rawPhone = match[1];
                }

                return {
                    name: nameNode ? nameNode.innerText : null,
                    rawPhone: rawPhone
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
