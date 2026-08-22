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
    console.log("🤖 Автопілот запущено! Збираємо фільми...");
    
    let collections = [];
    if (fs.existsSync('collections.json')) {
        try {
            collections = JSON.parse(fs.readFileSync('collections.json', 'utf8'));
        } catch (e) {
            collections = [];
        }
    }

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=uk-UA`);
        const tmdbData = await tmdbRes.json();
        
        if (!tmdbData.results || tmdbData.results.length === 0) {
            throw new Error("Не вдалося отримати фільми з TMDB");
        }

        const shuffled = tmdbData.results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        const movieNames = selected.map(m => m.title).join(", ");
        
        console.log(`🧠 Звертаємось до ШІ Gemini... (Фільми: ${movieNames})`);
        
        const prompt = `Ти кінокритик. Напиши коротку статтю-добірку про 5 фільмів: ${movieNames}.
Придумай яскравий заголовок і 2 абзаци вступу українською мовою.
Поверни ВИНЯТКОВО готовий JSON об'єкт без виділення коду чи слів:
{"title": "Твій заголовок", "description": "Твій текст вступу"}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const geminiData = await geminiRes.json();
        
        if (!geminiRes.ok) {
            console.error("Деталі відповіді Gemini:", JSON.stringify(geminiData));
            throw new Error(`Помилка Gemini API: ${geminiRes.status}`);
        }

        let aiText = geminiData.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        
        const article = JSON.parse(aiText);
        
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
        
        console.log("✅ ШІ успішно написав статтю!");

    } catch (e) {
        console.error("❌ Помилка під час виконання:", e.message);
    } finally {
        // Завжди зберігаємо файл, щоб GitHub Actions не "ламувався"
        fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2));
        console.log("💾 Файл collections.json оновлено.");
    }
}

runAutopilot();
