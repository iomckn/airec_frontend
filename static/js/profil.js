const API_BASE = "https://airec-api.randever.com";

function getToken() {
  return localStorage.getItem("access_token");
}

// ─── INITIALISATION ──────────────────────────────────────

async function init() {
  const token = getToken();

  if (!token) {
    document.getElementById("notLoggedIn").style.display = "flex";
    return;
  }

  document.getElementById("profileContent").style.display = "grid";

  const [user, ratingsData, genres] = await Promise.all([
    fetchProfile(token),
    fetchRatings(token),
    fetchGenres(),
  ]);

  if (!user) {
    localStorage.removeItem("access_token");
    document.getElementById("profileContent").style.display = "none";
    document.getElementById("notLoggedIn").style.display = "flex";
    return;
  }

  renderProfile(user);
  renderRatings(ratingsData);
  initEditForm(user, genres, token);
}

// ─── CHARGEMENT DONNÉES ───────────────────────────────────

async function fetchProfile(token) {
  try {
    const r = await fetch(`${API_BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fetchRatings(token) {
  try {
    const r = await fetch(`${API_BASE}/api/user/ratings?per_page=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fetchGenres() {
  try {
    const r = await fetch(`${API_BASE}/api/categories`);
    if (!r.ok) return [];
    const data = await r.json();
    if (Array.isArray(data)) return data;
    return data.categories || data.genres || data.results || [];
  } catch { return []; }
}

// ─── AFFICHAGE PROFIL ─────────────────────────────────────

function renderProfile(user) {
  const initials = (
    (user.prenom || "").charAt(0) + (user.nom || "").charAt(0)
  ).toUpperCase() || "?";

  document.getElementById("avatarLarge").textContent = initials;
  document.getElementById("profileName").textContent =
    [user.prenom, user.nom].filter(Boolean).join(" ") || "Utilisateur";
  document.getElementById("profileEmail").textContent = user.email || "";

  const genresEl = document.getElementById("profileGenres");
  const favGenres = user.favorite_genres || [];
  if (favGenres.length > 0) {
    genresEl.innerHTML = favGenres
      .map(g => `<span class="genre-pill">${g}</span>`)
      .join("");
  }
}

// ─── AFFICHAGE NOTES ──────────────────────────────────────

function renderRatings(data) {
  const loadingEl = document.getElementById("ratingsLoading");
  const emptyEl   = document.getElementById("ratingsEmpty");
  const gridEl    = document.getElementById("ratingsGrid");

  loadingEl.style.display = "none";

  const ratings = data
    ? (Array.isArray(data) ? data : (data.ratings || data.results || []))
    : [];

  if (ratings.length === 0) {
    emptyEl.style.display = "";
    return;
  }

  gridEl.innerHTML = ratings.map(item => {
    const movie   = item.movie || item;
    const title   = movie.title || "Film";
    const poster  = movie.poster_url || "/static/images/placeholder.jpg";
    const movieId = movie.id || movie.movie_id || item.movie_id || "";
    const score   = parseFloat(item.rating || item.score || 0);
    const stars   = "★".repeat(Math.round(score)) + "☆".repeat(5 - Math.round(score));

    return `
      <a class="rating-card" href="${movieId ? `/film/${movieId}` : '#'}">
        <img src="${poster}" alt="${title}"
             onerror="this.src='/static/images/placeholder.jpg'">
        <div class="rating-card-info">
          <p class="rating-card-title">${title}</p>
          <p class="rating-card-score">${stars} ${score.toFixed(1)}/5</p>
        </div>
      </a>`;
  }).join("");
}

// ─── FORMULAIRE ÉDITION ───────────────────────────────────

function initEditForm(user, genres, token) {
  const toggleBtn  = document.getElementById("editToggleBtn");
  const cancelBtn  = document.getElementById("cancelEditBtn");
  const editForm   = document.getElementById("editForm");
  const feedback   = document.getElementById("editFeedback");
  const checkboxes = document.getElementById("genreCheckboxes");

  // Pré-remplir les champs
  document.getElementById("editPrenom").value = user.prenom || "";
  document.getElementById("editNom").value    = user.nom    || "";

  // Construire la grille de genres
  const favGenres = user.favorite_genres || [];
  const genreList = genres.length > 0 ? genres : favGenres;

  if (genreList.length > 0) {
    checkboxes.innerHTML = genreList.map(g => {
      const checked = favGenres.includes(g) ? "checked" : "";
      return `<label class="checkbox-item">
        <input type="checkbox" name="favorite_genres" value="${g}" ${checked}> ${g}
      </label>`;
    }).join("");
  }

  // Afficher/masquer le formulaire
  toggleBtn.addEventListener("click", () => {
    const isOpen = editForm.style.display !== "none";
    editForm.style.display = isOpen ? "none" : "flex";
    toggleBtn.textContent  = isOpen ? "✏️ Modifier mon profil" : "✖ Fermer";
    feedback.textContent   = "";
  });

  cancelBtn.addEventListener("click", () => {
    editForm.style.display = "none";
    toggleBtn.textContent  = "✏️ Modifier mon profil";
    feedback.textContent   = "";
  });

  // Soumission
  editForm.addEventListener("submit", async e => {
    e.preventDefault();
    feedback.textContent = "";
    feedback.className   = "edit-feedback";

    const selectedGenres = Array.from(
      editForm.querySelectorAll('input[name="favorite_genres"]:checked')
    ).map(cb => cb.value);

    const body = {
      prenom: document.getElementById("editPrenom").value.trim(),
      nom:    document.getElementById("editNom").value.trim(),
      favorite_genres: selectedGenres,
    };

    try {
      const r = await fetch(`${API_BASE}/api/user/profile`, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (r.ok) {
        feedback.textContent = "Profil mis à jour ✓";
        feedback.className   = "edit-feedback success";
        // Mettre à jour l'affichage sans recharger
        document.getElementById("profileName").textContent =
          [body.prenom, body.nom].filter(Boolean).join(" ");
        document.getElementById("avatarLarge").textContent =
          ((body.prenom || "").charAt(0) + (body.nom || "").charAt(0)).toUpperCase() || "?";
        document.getElementById("profileGenres").innerHTML =
          selectedGenres.length > 0
            ? selectedGenres.map(g => `<span class="genre-pill">${g}</span>`).join("")
            : `<span class="no-genres">Aucun genre renseigné</span>`;
      } else {
        feedback.textContent = "Erreur lors de la mise à jour.";
        feedback.className   = "edit-feedback error";
      }
    } catch {
      feedback.textContent = "Erreur réseau.";
      feedback.className   = "edit-feedback error";
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
