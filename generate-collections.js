const fs = require('fs');

// Ваші ключі
const TMDB_KEY = '04c35731a5ee918f014970082a0088b1';
const GEMINI_KEY = 'AQ.Ab8RN6JrcVtbN8MO1_bObnW5xrV9cvOVqNFRWsYvLcOr5RR_Sg';

// Функція для створення посилань
function slugify(text) {
    const ru = "а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я є і ї ґ".split(" ");
    const en = "a b v h d e e zh z y y k l m n o p r s t u f kh ts ch sh shch y e yu ya ye i yi g".split(" ");
    let str = String(text || '').toLowerCase();
    for(let i=0; i<ru.length; i++) str = str.split(ru[i]).join(en[i]);
    return str.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function runAutopilot() {
    console.log("🤖 Автопілот запущено! Збираємо фільми...");
    
    try {
        // 1. Беремо найпопулярніші фільми цього тижня
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=uk-UA`);
        const tmdbData = await tmdbRes.json();
        
        // Вибираємо 5 випадкових
        const shuffled = tmdbData.results.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        const movieNames = selected.map(m => m.title).join(", ");
        
        // 2. Просимо ШІ написати статтю
        console.log(`🧠 Звертаємось до ШІ... (Фільми: ${movieNames})`);
        const prompt = `Ось 5 популярних фільмів: ${movieNames}. Придумай для них клікбейтний заголовок добірки (наприклад "5 фільмів на вечір, які знесуть дах") і напиши 2 абзаци інтригуючого тексту (вступ до добірки) українською мовою. 
        Поверни результат СУВОРО у форматі JSON (без маркдауну, просто голий JSON): {"title": "твій заголовок", "description": "твій текст"}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const geminiData = await geminiRes.json();
        
        let aiText = geminiData.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim(); // Чистимо код
        const article = JSON.parse(aiText);
        
        // 3. Формуємо красиву добірку
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
        
        // 4. Зберігаємо у файл
        let collections = [];
        if (fs.existsSync('collections.json')) {
            collections = JSON.parse(fs.readFileSync('collections.json'));
        }
        collections.unshift(newCollection); // Додаємо на початок
        if (collections.length > 20) collections.pop(); // Залишаємо тільки 20 останніх
        
        fs.writeFileSync('collections.json', JSON.stringify(collections, null, 2));
        console.log("✅ СУПЕР! ШІ написав статтю і зберіг у collections.json!");
        
    } catch (e) {
        console.error("❌ Помилка Автопілота (перевірте ключ ШІ):", e.message);
    }
}

runAutopilot();
