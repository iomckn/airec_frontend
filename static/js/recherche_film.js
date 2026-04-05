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
  container.querySelectorAll(".star").forEach((star, idx) => {
    star.classList.toggle("filled", idx < Math.round(ratingOutOf5));
  });
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
    const url = genre
      ? `${API_BASE}/api/recommendations/category/${encodeURIComponent(genre)}`
      : `${API_BASE}/api/recommendations/home`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.movies || data.recommendations || []);
  } catch {
    return [];
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
(function initCarousel() {
  const track   = document.getElementById("track");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (!track || !prevBtn || !nextBtn) return;
  let position = 0;
  const STEP = 220;
  nextBtn.addEventListener("click", () => {
    const maxScroll = track.scrollWidth - track.parentElement.clientWidth;
    position = Math.min(position + STEP, maxScroll);
    track.style.transform = `translateX(-${position}px)`;
  });
  prevBtn.addEventListener("click", () => {
    position = Math.max(position - STEP, 0);
    track.style.transform = `translateX(-${position}px)`;
  });
})();

document.addEventListener("DOMContentLoaded", init);