const fs = require('fs');

const TMDB_KEY = '04c35731a5ee918f014970082a0088b1';
const GEMINI_KEY = 'AQ.Ab8RN6JrcVtbN8MO1_bObnW5xrV9cvOVqNFRWsYvLcOr5RR_Sg';

function slugify(text) {
    const ru = "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я є і ї ґ".split(" ");
    const en = "a b v h d e e zh z y y k l m n o p r s t u f kh ts ch sh shch y e yu ya ye i yi g".split(" ");
    let str = String(text || '').toLowerCase();
    for(let i=0; i<ru.length; i++) str = str.split(ru[i]).join(en[i]);
    return str.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function runAutopilot() {
    console.log("🤖 Отримуємо популярні фільми з TMDB...");
    
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=uk-UA`);
    if (!tmdbRes.ok) throw new Error(`Помилка TMDB API: status ${tmdbRes.status}`);
    
    const tmdbData = await tmdbRes.json();
    if (!tmdbData.results || tmdbData.results.length === 0) {
        throw new Error("Не вдалося отримати список фільмів з TMDB");
    }

    const shuffled = tmdbData.results.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    const movieNames = selected.map(m => m.title).join(", ");

    console.log(`🧠 Звертаємось до Gemini API... (Фільми: ${movieNames})`);

    const prompt = `Ти кінокритик. Напиши яскраву статтю-добірку про ці 5 фільмів: ${movieNames}.
Придумай клікбейтний заголовок та 2 інтригуючі абзаци вступу українською мовою.
Поверни JSON об'єкт такого формату: {"title": "Заголовок", "description": "Текст вступу"}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
        console.error("Деталі помилки Gemini:", JSON.stringify(geminiData));
        throw new Error(`Помилка Gemini API: ${geminiRes.status}`);
    }

    const rawJson = geminiData.candidates[0].content.parts[0].text;
    const article = JSON.parse(rawJson);

    let collections = [];
    if (fs.existsSync('collections.json')) {
        try {
            collections = JSON.parse(fs.readFileSync('collections.json', 'utf8'));
        } catch (e) {
            collections = [];
        }
    }

    const newCollection = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        title: article.title,
        description: article.description,
        movies: selected.map(m => ({
            id: m.id,
            title: m.title,
            poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
            slug: slugify(m.title || m.original_title)
        }))
    };

    collections.unshift(newCollection);
    if (collections.length > 20) collections.pop();

    fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2));
    console.log("✅ УСПІХ! Нову статтю збережено у collections.json");
}

runAutopilot().catch(err => {
    console.error("❌ Критична помилка:", err.message);
    process.exit(1);
});
