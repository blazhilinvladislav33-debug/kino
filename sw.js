export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  const match = path.match(/\/(movie|tv)\/(\d+)/);
  if (!match) return context.next();

  const type = match[1]; 
  const id = match[2];   
  const TMDB_KEY = '04c35731a5ee918f014970082a0088b1';

  try {
    const response = await context.next();
    let html = await response.text();

    const apiRes = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=uk-UA`);
    const data = await apiRes.json();

    if (data && data.success !== false) {
      const title = data.title || data.name || 'КіноБаза';
      const desc = data.overview ? data.overview.substring(0, 160) + '...' : 'Дивитись фільм онлайн безкоштовно в HD якості з українською озвучкою.';
      const image = data.poster_path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.poster_path}` : 'https://kinobaza.site/icons/icon-512x512.png';
      const releaseYear = (data.release_date || data.first_air_date || '').substring(0, 4);
      
      // Ідеальний заголовок для SEO (саме так люди шукають в Гуглі)
      const fullTitle = `${title} (${releaseYear}) дивитись онлайн українською в HD | КіноБаза`;

      html = html.replace(/<title>.*<\/title>/, `<title>${fullTitle}</title>`);
      html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${desc}">`);
      html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${fullTitle}">`);
      html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${desc}">`);
      html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`);

      // СТВОРЮЄМО МІКРОРОЗМІТКУ ДЛЯ ГУГЛА (SCHEMA.ORG)
      const schema = {
        "@context": "https://schema.org",
        "@type": type === 'movie' ? "Movie" : "TVSeries",
        "name": title,
        "image": image,
        "description": desc,
        "datePublished": data.release_date || data.first_air_date || '',
        "aggregateRating": data.vote_average ? {
          "@type": "AggregateRating",
          "ratingValue": data.vote_average,
          "bestRating": "10",
          "ratingCount": data.vote_count || 1
        } : undefined
      };

      // Вставляємо цей код перед закриваючим тегом </head>
      const schemaHtml = `<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`;
      html = html.replace('</head>', schemaHtml);
    }

    return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
  } catch (error) {
    return context.next();
  }
};
