const fs = require('fs');
const https = require('https');

const TMDB_KEY = '04c35731a5ee918f014970082a0088b1'; // Ваш ключ
const SITE_URL = 'https://kinobaza.site';
const MOVIES_PAGES = 150; // 150 сторінок * 20 = 3000 фільмів
const TV_PAGES = 50;      // 50 сторінок * 20 = 1000 серіалів

// Функція для створення красивих посилань (slug), ідентична тій, що на сайті
function slugify(text) {
    text = String(text || '');
    const ru = "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я є і ї ґ".split(" ");
    const en = "a b v h d e e zh z y y k l m n o p r s t u f kh ts ch sh shch y e yu ya ye i yi g".split(" ");
    let str = text.toLowerCase();
    for(let i=0; i<ru.length; i++) {
        str = str.split(ru[i]).join(en[i]);
    }
    return str.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Допоміжна функція для запитів до TMDB
function fetchTMDB(endpoint, page) {
    return new Promise((resolve, reject) => {
        const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_KEY}&language=uk-UA&sort_by=popularity.desc&page=${page}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', err => reject(err));
    });
}

async function generateSitemap() {
    const urls = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Додаємо головні сторінки сайту
    urls.push({ loc: `${SITE_URL}/`, priority: '1.0' });
    urls.push({ loc: `${SITE_URL}/category/movie`, priority: '0.9' });
    urls.push({ loc: `${SITE_URL}/category/tv`, priority: '0.9' });
    urls.push({ loc: `${SITE_URL}/category/animation`, priority: '0.8' });
    urls.push({ loc: `${SITE_URL}/category/top`, priority: '0.8' });

    console.log('🎬 Починаємо збір 3000 популярних фільмів...');
    for (let page = 1; page <= MOVIES_PAGES; page++) {
        try {
            const data = await fetchTMDB('/discover/movie', page);
            if (data && data.results) {
                data.results.forEach(m => {
                    const slug = slugify(m.title || m.original_title);
                    urls.push({ loc: `${SITE_URL}/movie/${m.id}-${slug}`, priority: '0.7' });
                });
            }
            if (page % 10 === 0) console.log(`   Завантажено сторінок фільмів: ${page}/${MOVIES_PAGES}`);
        } catch (e) { console.error(`Помилка на сторінці фільмів ${page}`); }
    }

    console.log('📺 Починаємо збір 1000 популярних серіалів...');
    for (let page = 1; page <= TV_PAGES; page++) {
        try {
            const data = await fetchTMDB('/discover/tv', page);
            if (data && data.results) {
                data.results.forEach(s => {
                    const slug = slugify(s.name || s.original_name);
                    urls.push({ loc: `${SITE_URL}/tv/${s.id}-${slug}`, priority: '0.7' });
                });
            }
            if (page % 10 === 0) console.log(`   Завантажено сторінок серіалів: ${page}/${TV_PAGES}`);
        } catch (e) { console.error(`Помилка на сторінці серіалів ${page}`); }
    }

    // 2. Формуємо XML файл
    console.log('📝 Формуємо файл sitemap.xml...');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    fs.writeFileSync('sitemap.xml', xml);
    console.log(`✅ ГОТОВО! У файл sitemap.xml записано ${urls.length} посилань.`);
}

generateSitemap();
