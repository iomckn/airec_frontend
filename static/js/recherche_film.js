const API_BASE = "https://airec-api.randever.com";

function getToken() {
  return localStorage.getItem("access_token") || null;
}

function getMovieIdFromURL() {
  const parts = window.location.pathname.split("/");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) return parts[i];
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function showError(msg) {
  document.getElementById("loadingState").style.display = "none";
  const errorEl = document.getElementById("errorState");
  document.getElementById("errorMsg").textContent = msg;
  errorEl.style.display = "";
}

// ─── RECHERCHE ────────────────────────────────────────────────

async function searchMovies(query) {
  const url = `${API_BASE}/api/movies?search=${encodeURIComponent(query)}&per_page=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.movies || data.results || []);
}

function renderSearchResults(movies, query) {
  document.getElementById("loadingState").style.display = "none";

  const count = movies.length;
  document.getElementById("searchTitle").textContent =
    `Résultats pour "${query}" — ${count} film${count !== 1 ? "s" : ""}`;

  if (count === 0) {
    document.getElementById("searchEmpty").style.display = "";
  } else {
    document.getElementById("searchGrid").innerHTML = movies.map(m => {
      const genres = (m.genres || []).slice(0, 3)
        .map(g => `<span class="genre-tag">${g}</span>`).join("");
      const rating  = parseFloat(m.average_rating || 0).toFixed(1);
      const poster  = m.poster_url || "/static/images/placeholder.jpg";
      const title   = (m.title || "Film").replace(/"/g, "&quot;");
      return `
        <a href="/film/${m.id}" class="movie-card">
          <img src="${poster}" alt="${title}" class="movie-card-poster"
               onerror="this.src='/static/images/placeholder.jpg'">
          <div class="movie-card-info">
            <h3 class="movie-card-title">${m.title || "Film"}</h3>
            <p class="movie-card-year">${m.release_year || ""}</p>
            <div class="movie-card-genres">${genres}</div>
            <p class="movie-card-rating">⭐ ${rating}/5
              <span class="ratings-count">(${m.ratings_count || 0} avis)</span>
            </p>
          </div>
        </a>`;
    }).join("");
  }

  document.getElementById("searchSection").style.display = "";
}

async function initSearch(query) {
  document.getElementById("pageTitle").textContent = `AiRec - "${query}"`;
  document.getElementById("loadingMsg").textContent = `Recherche de "${query}"...`;

  // Pré-remplir la barre de recherche
  const searchInput = document.querySelector(".search input[name='q']");
  if (searchInput) searchInput.value = query;

  try {
    const movies = await searchMovies(query);
    renderSearchResults(movies, query);
  } catch (err) {
    showError("Erreur lors de la recherche. Veuillez réessayer.");
  }
}

// ─── DÉTAIL FILM ─────────────────────────────────────────────

function renderAvgStars(ratingOutOf5) {
  const container = document.getElementById("avgStars");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const fill = Math.min(Math.max(ratingOutOf5 - (i - 1), 0), 1);
    const pct  = Math.round(fill * 100);
    const id   = `star-grad-${i}`;
    container.insertAdjacentHTML("beforeend", `
      <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
            <stop offset="${pct}%"  stop-color="#f1cf57"/>
            <stop offset="${pct}%"  stop-color="#bcbcbc"/>
          </linearGradient>
        </defs>
        <polygon points="13,2 16,9 24,9 18,14 20,22 13,17 6,22 8,14 2,9 10,9"
                 fill="url(#${id})"/>
      </svg>`);
  }
}

function renderUserStars(ratingOutOf5) {
  document.querySelectorAll("#userStars .star-btn").forEach((btn, idx) => {
    btn.classList.toggle("filled", idx < ratingOutOf5);
  });
  document.getElementById("myScore").textContent = ratingOutOf5;
  document.getElementById("ratingValue").value   = ratingOutOf5;
}

function renderGenres(genres = []) {
  const container = document.getElementById("movieGenres");
  if (!container) return;
  container.innerHTML = genres.map(g => `<span class="genre-tag">${g}</span>`).join("");
}

function renderCarousel(movies = []) {
  const track = document.getElementById("track");
  if (!track || !movies || movies.length === 0) return;
  track.innerHTML = movies.map(movie => {
    const poster = movie.poster_url || movie.poster || "";
    const title  = movie.title || movie.titre || "Film";
    const id     = movie.id || movie.movie_id || "";
    const href   = id ? `/film/${id}` : "#";
    return `
      <a href="${href}" class="car-item-link" title="${title}">
        <img src="${poster}" alt="${title}" class="car-item"
             onerror="this.src='/static/images/placeholder.jpg'">
      </a>`;
  }).join("");
  document.getElementById("recoSection").style.display = "";
  initCarousel();
}

async function loadMovie(movieId) {
  const res = await fetch(`${API_BASE}/api/movies/${movieId}`);
  if (!res.ok) throw new Error(`Film introuvable (${res.status})`);
  return res.json();
}

async function loadUserRating(movieId) {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/api/movies/${movieId}/ratings/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function loadRecommendations(genre) {
  try {
    let all  = [];
    let page = 1;
    const limit = 50;
    while (true) {
      const url = genre
        ? `${API_BASE}/api/recommendations/category/${encodeURIComponent(genre)}?page=${page}&limit=${limit}`
        : `${API_BASE}/api/recommendations/home?page=${page}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data   = await res.json();
      const movies = Array.isArray(data) ? data : (data.movies || data.recommendations || []);
      if (movies.length === 0) break;
      all = [...all, ...movies];
      if (page === 1) renderCarousel(all);
      if (movies.length < limit) break;
      page++;
    }
    if (page > 1) renderCarousel(all);
  } catch (err) {
    console.error("Erreur chargement recommandations:", err);
  }
}

async function submitRating(movieId, ratingOutOf5) {
  const token    = getToken();
  const statusEl = document.getElementById("ratingStatus");
  if (!token) {
    statusEl.textContent = "Connectez-vous pour noter ce film.";
    statusEl.className   = "rating-status error";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/movies/${movieId}/ratings`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ rating: ratingOutOf5 }),
    });
    statusEl.textContent = res.ok ? "Note enregistrée ✓" : "Erreur lors de l'envoi.";
    statusEl.className   = res.ok ? "rating-status success" : "rating-status error";
  } catch {
    statusEl.textContent = "Erreur réseau.";
    statusEl.className   = "rating-status error";
  }
  setTimeout(() => { statusEl.textContent = ""; }, 3000);
}

function initUserStars(movieId) {
  const buttons = document.querySelectorAll("#userStars .star-btn");
  buttons.forEach(btn => {
    btn.addEventListener("mouseenter", () => {
      const val = parseInt(btn.dataset.value);
      buttons.forEach((b, idx) => b.classList.toggle("hovered", idx < val));
    });
    btn.addEventListener("mouseleave", () => {
      buttons.forEach(b => b.classList.remove("hovered"));
    });
    btn.addEventListener("click", () => {
      const rating = parseInt(btn.dataset.value);
      renderUserStars(rating);
      submitRating(movieId, rating);
    });
  });
}

async function initMovieDetail(movieId) {
  const loadingEl = document.getElementById("loadingState");
  const heroEl    = document.getElementById("heroSection");

  try {
    const [movie, userRatingData] = await Promise.all([
      loadMovie(movieId),
      loadUserRating(movieId),
    ]);

    document.getElementById("movieTitle").textContent = movie.title;
    document.getElementById("pageTitle").textContent  = `AiRec - ${movie.title}`;
    document.getElementById("movieMeta").textContent  = movie.release_year || "";
    document.getElementById("movieDesc").textContent  =
      movie.description || "Aucune description disponible.";

    const posterEl = document.getElementById("moviePoster");
    posterEl.src = movie.poster_url || "/static/images/placeholder.jpg";
    posterEl.alt = movie.title;

    renderGenres(movie.genres || []);

    const avgRating = parseFloat(movie.average_rating || 0);
    document.getElementById("avgScore").textContent    = `${avgRating.toFixed(1)}/5`;
    document.getElementById("reviewCount").textContent = movie.ratings_count || 0;
    renderAvgStars(avgRating);

    if (userRatingData) {
      renderUserStars(Math.round(parseFloat(userRatingData.rating || 0)));
    }

    initUserStars(movieId);
    loadingEl.style.display = "none";
    heroEl.style.display    = "";

    loadRecommendations(movie.genres?.[0]);

  } catch (err) {
    console.error(err);
    showError("Impossible de charger le film. Veuillez réessayer.");
  }
}

// ─── CAROUSEL ────────────────────────────────────────────────

function initCarousel() {
  const track   = document.getElementById("track");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (!track || !prevBtn || !nextBtn) return;

  const STEP = 190 + 16;

  const newPrev = prevBtn.cloneNode(true);
  const newNext = nextBtn.cloneNode(true);
  prevBtn.replaceWith(newPrev);
  nextBtn.replaceWith(newNext);

  newNext.addEventListener("click", () => { track.scrollLeft += STEP * 5; });
  newPrev.addEventListener("click", () => { track.scrollLeft -= STEP * 5; });
}

// ─── POINT D'ENTRÉE ──────────────────────────────────────────

async function init() {
  const params  = new URLSearchParams(window.location.search);
  const query   = params.get("q");
  const movieId = getMovieIdFromURL();

  if (query && query.trim()) {
    await initSearch(query.trim());
    return;
  }

  if (movieId) {
    await initMovieDetail(movieId);
    return;
  }

  showError("Aucun film spécifié dans l'URL.");
}

document.addEventListener("DOMContentLoaded", init);
