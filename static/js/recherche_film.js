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

function renderAvgStars(ratingOutOf5) {
  const container = document.getElementById("avgStars");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const fill = Math.min(Math.max(ratingOutOf5 - (i - 1), 0), 1); // 0 à 1
    const pct  = Math.round(fill * 100);

    const id = `star-grad-${i}`;
    const svg = `
      <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
            <stop offset="${pct}%"       stop-color="#f1cf57"/>
            <stop offset="${pct}%"       stop-color="#bcbcbc"/>
          </linearGradient>
        </defs>
        <polygon
          points="13,2 16,9 24,9 18,14 20,22 13,17 6,22 8,14 2,9 10,9"
          fill="url(#${id})"
        />
      </svg>`;
    container.insertAdjacentHTML("beforeend", svg);
  }
}

function renderUserStars(ratingOutOf5) {
  document.querySelectorAll("#userStars .star-btn").forEach((btn, idx) => {
    btn.classList.toggle("filled", idx < ratingOutOf5);
  });
  document.getElementById("myScore").textContent = ratingOutOf5;
  document.getElementById("ratingValue").value = ratingOutOf5;
}

function renderGenres(genres = []) {
  const container = document.getElementById("movieGenres");
  if (!container) return;
  container.innerHTML = genres.map(g => `<span class="genre-tag">${g}</span>`).join("");
}

function renderCarousel(movies = []) {
  const track = document.getElementById("track");
  if (!track || movies.length === 0) return;
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

  // Initialiser le carousel APRÈS que les items sont dans le DOM
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
    let all = [];
    let page = 1;
    const limit = 50; // films par page

    while (true) {
      const url = genre
        ? `${API_BASE}/api/recommendations/category/${encodeURIComponent(genre)}?page=${page}&limit=${limit}`
        : `${API_BASE}/api/recommendations/home?page=${page}&limit=${limit}`;

      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json();
      const movies = Array.isArray(data) ? data : (data.movies || data.recommendations || []);

      if (movies.length === 0) break;

      all = [...all, ...movies];

      // Afficher les premiers résultats immédiatement sans attendre la fin
      if (page === 1) renderCarousel(all);

      if (movies.length < limit) break; // dernière page atteinte
      page++;
    }

    // Mise à jour finale avec tous les films
    if (page > 1) renderCarousel(all);

  } catch (err) {
    console.error("Erreur chargement recommandations:", err);
  }
}

async function submitRating(movieId, ratingOutOf5) {
  const token = getToken();
  const statusEl = document.getElementById("ratingStatus");
  if (!token) {
    statusEl.textContent = "Connectez-vous pour noter ce film.";
    statusEl.className = "rating-status error";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/movies/${movieId}/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating: ratingOutOf5 }),
    });
    if (res.ok) {
      statusEl.textContent = "Note enregistrée ✓";
      statusEl.className = "rating-status success";
    } else {
      statusEl.textContent = "Erreur lors de l'envoi.";
      statusEl.className = "rating-status error";
    }
  } catch {
    statusEl.textContent = "Erreur réseau.";
    statusEl.className = "rating-status error";
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

async function init() {
  const movieId  = getMovieIdFromURL();
  const loadingEl = document.getElementById("loadingState");
  const errorEl   = document.getElementById("errorState");
  const heroEl    = document.getElementById("heroSection");

  if (!movieId) {
    loadingEl.style.display = "none";
    errorEl.style.display = "";
    errorEl.querySelector("p").textContent = "Aucun film spécifié dans l'URL.";
    return;
  }

  try {
    const [movie, userRatingData] = await Promise.all([
      loadMovie(movieId),
      loadUserRating(movieId),
    ]);

    document.getElementById("movieTitle").textContent = movie.title;
    document.getElementById("pageTitle").textContent  = `AiRec - ${movie.title}`;

    const year = movie.release_year || "";
    document.getElementById("movieMeta").textContent = year;

    const posterEl = document.getElementById("moviePoster");
    posterEl.src = movie.poster_url || "/static/images/placeholder.jpg";
    posterEl.alt = movie.title;

    document.getElementById("movieDesc").textContent =
      movie.description || "Aucune description disponible.";

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

    loadRecommendations(movie.genres?.[0]).then(renderCarousel);

  } catch (err) {
    console.error(err);
    loadingEl.style.display = "none";
    errorEl.style.display   = "";
  }
}

// Carousel
function initCarousel() {
  const track   = document.getElementById("track");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (!track || !prevBtn || !nextBtn) return;

  const STEP = 190 + 16; // largeur affiche + gap

  const newPrev = prevBtn.cloneNode(true);
  const newNext = nextBtn.cloneNode(true);
  prevBtn.replaceWith(newPrev);
  nextBtn.replaceWith(newNext);

  newNext.addEventListener("click", () => {
    track.scrollLeft += STEP * 5; // avance de 5 affiches
  });

  newPrev.addEventListener("click", () => {
    track.scrollLeft -= STEP * 5; // recule de 5 affiches
  });
}
document.addEventListener("DOMContentLoaded", init);