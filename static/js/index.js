(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const body = document.body;
  const pageLoader = document.getElementById('pageLoader');

  const API_BASE = hero.dataset.apiBase || 'https://airec-api.randever.com';

  const titlePrimary = document.getElementById('movieTitlePrimary');
  const titleSecondary = document.getElementById('movieTitleSecondary');
  const overview = document.getElementById('movieOverview');
  const genresContainer = document.getElementById('movieGenres');
  const ratingText = document.getElementById('movieRating');
  const starsContainer = document.getElementById('movieStars');
  const botBubble = document.getElementById('botBubble');

  const prevBtn = document.getElementById('prevMovie');
  const nextBtn = document.getElementById('nextMovie');
  const dotsContainer = document.getElementById('movieDots');

  const defaultBackground = getComputedStyle(hero).backgroundImage;
  let movies = [];
  let currentIndex = 0;

  function revealPage() {
    hero.classList.remove('api-pending');
    if (body) body.classList.remove('page-loading');
    if (pageLoader) pageLoader.classList.add('hidden');
  }

  const revealTimeout = setTimeout(revealPage, 6000);

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeMovies(payload) {
    if (Array.isArray(payload)) return payload;

    const candidates = [
      payload?.data,
      payload?.movies,
      payload?.results,
      payload?.recommendations,
      payload?.home_recommendations,
      payload?.items
    ];

    for (const value of candidates) {
      if (Array.isArray(value)) return value;
    }

    return [];
  }

  function splitTitle(rawTitle) {
    const title = (rawTitle || 'Film recommandé').trim();
    const words = title.split(/\s+/);

    if (words.length === 1) {
      return { first: words[0].toUpperCase(), second: '' };
    }

    const cut = Math.ceil(words.length / 2);
    return {
      first: words.slice(0, cut).join(' ').toUpperCase(),
      second: words.slice(cut).join(' ').toUpperCase()
    };
  }

  function extractGenres(movie) {
    if (Array.isArray(movie?.genres)) return movie.genres;
    if (Array.isArray(movie?.categories)) return movie.categories;
    if (typeof movie?.genre === 'string') return movie.genre.split('|').map((g) => g.trim()).filter(Boolean);
    return [];
  }

  function extractRating(movie) {
    const value = Number(movie?.rating ?? movie?.average_rating ?? movie?.vote_average ?? 0);
    if (!Number.isFinite(value) || value <= 0) return null;

    // Normalise en /5 (l'API TMDB renvoie du /10)
    const on5 = value > 5 ? value / 2 : value;
    return Number(on5.toFixed(1));
  }

  function renderStars(ratingOn5) {
    if (!starsContainer) return;

    const stars = Array.from(starsContainer.querySelectorAll('.star'));
    stars.forEach((star, index) => {
      const isActive = index + 1 <= Math.round(ratingOn5);
      star.classList.toggle('inactive', !isActive);
    });
  }

  function updateBackground(movie) {
    const image = movie?.backdrop_url || movie?.backdrop || movie?.image_url || movie?.poster_url || movie?.poster;

    if (!image) {
      hero.style.backgroundImage = defaultBackground;
      return;
    }

    hero.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,.65) 0%, rgba(0,0,0,.2) 55%, rgba(0,0,0,.65) 100%), url("${image}")`;
  }

  function renderGenres(movie) {
    if (!genresContainer) return;

    const genres = extractGenres(movie).slice(0, 4);
    genresContainer.innerHTML = '';

    if (!genres.length) {
      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = 'Recommandé';
      genresContainer.appendChild(pill);
      return;
    }

    genres.forEach((genre) => {
      const pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = genre;
      genresContainer.appendChild(pill);
    });
  }

  function renderDots() {
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';

    safeArray(movies).forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `dot ${index === currentIndex ? 'active' : ''}`.trim();
      dot.setAttribute('aria-label', `Aller au film ${index + 1}`);
      dot.addEventListener('click', () => {
        currentIndex = index;
        renderCurrentMovie();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function renderCurrentMovie() {
    const movie = movies[currentIndex];
    if (!movie) return;

    const title = splitTitle(movie?.title || movie?.name || movie?.original_title);
    if (titlePrimary) titlePrimary.textContent = title.first;
    if (titleSecondary) titleSecondary.textContent = title.second;

    if (overview) {
      overview.textContent = movie?.overview || movie?.description || 'Découvrez une nouvelle recommandation sélectionnée pour vous.';
    }

    const rating = extractRating(movie);
    if (ratingText) {
      ratingText.textContent = rating ? `${rating}/5` : 'N/A';
    }

    renderGenres(movie);
    renderStars(rating);
    updateBackground(movie);

    if (botBubble) {
      botBubble.innerHTML = `<strong>AiRec :</strong> ${movie?.title || movie?.name || 'Ce film pourrait vous plaire'} ⭐`;
    }

    renderDots();
  }

  function nextMovie(step) {
    if (!movies.length) return;
    currentIndex = (currentIndex + step + movies.length) % movies.length;
    renderCurrentMovie();
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async function loadMovies() {
    try {
      const homePayload = await fetchJson(`${API_BASE}/api/recommendations/home`);
      movies = normalizeMovies(homePayload).slice(0, 10);

      if (!movies.length) {
        const featuredPayload = await fetchJson(`${API_BASE}/api/movies/featured?limit=10`);
        movies = normalizeMovies(featuredPayload).slice(0, 10);
      }

      if (!movies.length) return;

      currentIndex = 0;
      renderCurrentMovie();
    } catch (error) {
      console.error('Impossible de charger les recommandations :', error);
      if (botBubble) {
        botBubble.innerHTML = '<strong>AiRec :</strong> API indisponible pour le moment. Affichage par défaut.';
      }
    } finally {
      clearTimeout(revealTimeout);
      revealPage();
    }
  }

  if (prevBtn) prevBtn.addEventListener('click', () => nextMovie(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => nextMovie(1));

  loadMovies();

  // CHATBOT
  const preview = document.getElementById("chatbot-preview");
  const toggleBtn = document.getElementById("chatbot-toggle");
  const chatbotWindow = document.getElementById("chatbot-window");
  const closeBtn = document.getElementById("chatbot-close");

  // ouvrir via bulle OU robot
  preview.addEventListener("click", openChat);
  toggleBtn.addEventListener("click", openChat);

  function openChat() {
    chatbotWindow.classList.remove("hidden");
    preview.style.display = "none";
  }

  // fermer
  closeBtn.addEventListener("click", () => {
    chatbotWindow.classList.add("hidden");
    preview.style.display = "flex";
  });

  let sessionId = null;

  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatbox = document.getElementById("chatbox");

  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `message ${sender}`;

    div.innerHTML = text; 

    chatbox.appendChild(div);
    chatbox.scrollTop = chatbox.scrollHeight;
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = chatInput.value;
    addMessage(message, "user");
    chatInput.value = "";

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId
        })
      });

      const data = await res.json();
      console.log("BOT:", data.response);
      sessionId = data.session_id;

      let text = data.response;

      if (data.recommendations) {
        text += "<br><br>";
        data.recommendations.slice(0, 5).forEach(movie => {
          text += "🎬 " + movie.title + "<br>";
        });
      }

      addMessage(text, "bot");
      

      } catch (err) {
        addMessage("Erreur 😢", "bot");
      }
  });



})();
