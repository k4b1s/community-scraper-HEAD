require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const prompt = require('prompt-sync')();
const emojiRegex = require('emoji-regex');

async function loginAndGetAuthToken(page) {
    const username = prompt('X (Twitter) identifiant ou email : ');
    const password = prompt.hide('Mot de passe : ');

    await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });

    // Attendre explicitement l'input identifiant/email
    const inputSelector = 'input[name="text"]';
    try {
        await page.waitForSelector(inputSelector, { timeout: 10000 });
    } catch (e) {
        throw new Error("Champ identifiant/email introuvable sur la page de login X.");
    }
    await page.type(inputSelector, username);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // Si X demande un identifiant supplémentaire (ex: username après email)
    const passwordInput = await page.$('input[name="password"]');
    if (!passwordInput) {
        const username2 = prompt('Nom d’utilisateur X (si demandé) : ');
        await page.waitForSelector(inputSelector, { timeout: 10000 });
        await page.type(inputSelector, username2);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);
    }

    // Remplis le champ mot de passe
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await page.type('input[name="password"]', password);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Récupère le cookie auth_token
    const cookies = await page.cookies();
    const authCookie = cookies.find(c => c.name === 'auth_token');
    if (!authCookie) throw new Error('auth_token introuvable après connexion');
    return authCookie;
}

async function scrapeCommunityMembers(url) {
    // Configuration du navigateur pour affichage (headless: false)
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--js-flags=--max-old-space-size=4096'
        ],
        protocolTimeout: 300000 // 5 minutes
    });
    const page = await browser.newPage();
    
    // Connexion comme avant
    const authCookie = await loginAndGetAuthToken(page);
    await page.setCookie(authCookie);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log('Page chargée, début du scroll et extraction progressive...');
    
    // Ensemble pour éviter les doublons
    const allMembers = new Map();

    // Utiliser autoScroll avec plus de tentatives et un temps d'attente plus long
    const maxScrolls = 500; // Augmenté de 500 à 1000
    console.log('Début du scroll progressif...');
    let lastCount = 0;
    let unchangedCounter = 0;
    const maxUnchanged = 40; // Augmenté de 20 à 40

    for (let i = 0; i < maxScrolls; i++) {
        // Scroll plus lent et plus progressif
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(1200); // Plus long
        
        // Attendre que le réseau soit inactif
        await page.waitForNetworkIdle({idleTime: 800, timeout: 5000}).catch(() => {});
        
        // Tous les 2 scrolls (au lieu de 5), extraction des membres visibles
        if (i % 2 === 0 || i === maxScrolls - 1) {
            const currentMembers = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('li[data-testid="UserCell"]')).map(li => {
                    const links = li.querySelectorAll('a[role="link"][href^="/"]');
                    let login = null, username = null;
                    links.forEach(link => {
                        const spans = link.querySelectorAll('span');
                        spans.forEach(span => {
                            const txt = span.textContent.trim();
                            if (txt.startsWith('@')) login = txt;
                            else if (txt && !username) username = txt;
                        });
                    });
                    return (login && username) ? { login, username } : null;
                }).filter(Boolean);
            });
            
            // Ajoute à notre collection
            currentMembers.forEach(member => {
                allMembers.set(member.login, member);
            });
            
            console.log(`Scroll ${i+1}: ${currentMembers.length} membres visibles, ${allMembers.size} membres uniques collectés`);
            
            // Sauvegarde intermédiaire tous les 100 scrolls
            if (i % 100 === 0 && i > 0) {
                const tempMembers = Array.from(allMembers.values());
                fs.writeFileSync(`members_temp_${i}.csv`, 'login,username\n' + 
                    tempMembers.map(m => `"${m.login.replace(/"/g, '""')}","${m.username.replace(/"/g, '""')}"`).join('\n'), 'utf-8');
                console.log(`Sauvegarde intermédiaire: ${tempMembers.length} membres`);
            }
        }
        
        // Tous les 3 scrolls, faire un scroll complet pour forcer le chargement
        if (i % 3 === 0) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2500);
            await page.waitForNetworkIdle({idleTime: 800, timeout: 5000}).catch(() => {});
        }
        
        // Vérifier si de nouveaux membres ont été chargés
        const count = await page.evaluate(() => 
            document.querySelectorAll('li[data-testid="UserCell"]').length
        );

        if (count === lastCount) {
            unchangedCounter++;
            console.log(`Aucun nouveau membre - Tentative ${unchangedCounter}/${maxUnchanged}`);
            
            // Stratégie de "déblocage" améliorée
            if (unchangedCounter % 4 === 0) {
                // Essayer un scroll haut-bas-haut
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.waitForTimeout(1000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(2000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight/2));
                await page.waitForTimeout(1500);
            }
            
            if (unchangedCounter >= maxUnchanged) {
                console.log(`Aucun nouveau membre après ${maxUnchanged} tentatives. Arrêt.`);
                break;
            }
        } else {
            unchangedCounter = 0;
            lastCount = count;
        }
    }
    
    // Conversion en tableau pour l'export
    const members = Array.from(allMembers.values());
    
    // Sauvegarde en CSV (comme avant)
    const csvHeader = 'login,username\n';
    const csvRows = members.map(member => {
        const login = `"${member.login.replace(/"/g, '""')}"`;
        const username = `"${member.username.replace(/"/g, '""')}"`;
        return `${login},${username}`;
    });
    const csvContent = csvHeader + csvRows.join('\n');
    fs.writeFileSync('members.csv', csvContent, 'utf-8');
    
    console.log(`Total final: ${members.length} membres extraits`);
    
    await browser.close();
}

async function autoScroll(page, maxScrolls = 500) {
    console.log('Début du scroll progressif...');
    let lastCount = 0;
    let unchangedCounter = 0;
    const maxUnchanged = 20;

    for (let i = 0; i < maxScrolls; i++) {
        // 1. Scroll progressif plus efficace
        await page.evaluate(() => {
            window.scrollBy(0, 1000);
        });
        await page.waitForTimeout(800);

        // 2. Attendre que le réseau soit inactif après chaque scroll pour s'assurer que tout est chargé
        await page.waitForNetworkIdle({idleTime: 500, timeout: 5000}).catch(() => {});

        // 3. Tous les 3 scrolls, faire un scroll complet pour forcer le chargement
        if (i % 3 === 0) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
            await page.waitForNetworkIdle({idleTime: 500, timeout: 5000}).catch(() => {});
        }

        // Vérifie combien de membres sont chargés
        const count = await page.evaluate(() => 
            document.querySelectorAll('li[data-testid="UserCell"]').length
        );

        console.log(`Scroll ${i + 1}/${maxScrolls}: ${count} membres chargés`);

        if (count === lastCount) {
            unchangedCounter++;
            console.log(`Aucun nouveau membre - Tentative ${unchangedCounter}/${maxUnchanged}`);
            // Essayer un "rafraîchissement" du scroll pour débloquer
            if (unchangedCounter % 5 === 0) {
                await page.evaluate(() => {
                    window.scrollTo(0, 0); // Remonte en haut
                });
                await page.waitForTimeout(1000);
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight); // Redescend
                });
                await page.waitForTimeout(2000);
            }
            
            if (unchangedCounter >= maxUnchanged) {
                console.log(`Aucun nouveau membre après ${maxUnchanged} scrolls. Arrêt.`);
                break;
            }
        } else {
            unchangedCounter = 0;
            lastCount = count;
        }
    }

    return lastCount;
}

module.exports = scrapeCommunityMembers;

if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.error('Usage: node scraper.js <url-à-scraper>');
        process.exit(1);
    }
    scrapeCommunityMembers(url)
        .then(() => console.log('Scraping terminé.'))
        .catch(err => {
            console.error('Erreur:', err);
            process.exit(1);
        });
}