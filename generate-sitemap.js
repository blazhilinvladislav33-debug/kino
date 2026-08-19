const fs = require('fs');

const TMDB_API_KEY = '04c35731a5ee918f014970082a0088b1'; // Твій API-ключ TMDB
const BASE_URL = 'https://kinobaza.site';

async function fetchTmdb(endpoint, page = 1) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=uk-UA&page=${page}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

async function generateSitemap() {
  console.log('Збір популярних фільмів та новинок з TMDB...');
  const itemsList = [];

  // 1. Головна сторінка
  itemsList.push({ loc: `${BASE_URL}/`, priority: '1.0', freq: 'daily' });

  // 2. Топ-200 популярних фільмів (10 сторінок по 20 = 200 фільмів)
  for (let page = 1; page <= 10; page++) {
    const movies = await fetchTmdb('/movie/popular', page);
    movies.forEach(m => {
      itemsList.push({ loc: `${BASE_URL}/movie/${m.id}`, priority: '0.8', freq: 'weekly' });
    });
  }

  // 3. Гарячі новинки (зараз у кіно - 3 сторінки = 60 фільмів)
  for (let page = 1; page <= 3; page++) {
    const movies = await fetchTmdb('/movie/now_playing', page);
    movies.forEach(m => {
      itemsList.push({ loc: `${BASE_URL}/movie/${m.id}`, priority: '0.9', freq: 'daily' });
    });
  }

  // 4. Популярні серіали (3 сторінки = 60 серіалів)
  for (let page = 1; page <= 3; page++) {
    const tvs = await fetchTmdb('/tv/popular', page);
    tvs.forEach(t => {
      itemsList.push({ loc: `${BASE_URL}/tv/${t.id}`, priority: '0.8', freq: 'weekly' });
    });
  }

  // Прибираємо дублікати
  const uniqueMap = new Map();
  itemsList.forEach(item => uniqueMap.set(item.loc, item));

  // Формуємо XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  uniqueMap.forEach(item => {
    xml += `  <url>\n`;
    xml += `    <loc>${item.loc}</loc>\n`;
    xml += `    <changefreq>${item.freq}</changefreq>\n`;
    xml += `    <priority>${item.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  fs.writeFileSync('sitemap.xml', xml, 'utf8');
  console.log(`Успішно оновлено sitemap.xml! Усього посилань: ${uniqueMap.size}`);
}

generateSitemap();
