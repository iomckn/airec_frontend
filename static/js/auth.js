(function () {
  const API_BASE = "https://airec-api.randever.com";
  const token = localStorage.getItem("access_token");
  if (!token) return;

  function buildAvatar(user) {
    const initials = (
      (user.prenom || "").charAt(0) + (user.nom || "").charAt(0)
    ).toUpperCase() || "?";
    const fullName = [user.prenom, user.nom].filter(Boolean).join(" ");

    const wrapper = document.createElement("div");
    wrapper.className = "user-nav";
    wrapper.innerHTML = `
      <div class="user-avatar" title="${fullName}">${initials}</div>
      <div class="user-dropdown">
        <div class="user-dropdown-name">${fullName}</div>
        <a href="/profil">👤 Mon profil</a>
        <button class="logout-btn">🚪 Déconnexion</button>
      </div>`;

    wrapper.querySelector(".user-avatar").addEventListener("click", e => {
      e.stopPropagation();
      wrapper.querySelector(".user-dropdown").classList.toggle("open");
    });

    document.addEventListener("click", () => {
      wrapper.querySelector(".user-dropdown").classList.remove("open");
    });

    wrapper.querySelector(".logout-btn").addEventListener("click", () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_cache");
      window.location.href = "/";
    });

    return wrapper;
  }

  function removeAuthLinks() {
    document.querySelectorAll(".navAuthLink, #navAuthLink").forEach(el => el.remove());
  }

  function injectAvatar(user) {
    removeAuthLinks();
    const topbar = document.querySelector(".topbar");
    if (topbar && !topbar.querySelector(".user-nav")) {
      topbar.appendChild(buildAvatar(user));
    }
  }

  function init() {
    // Affichage immédiat depuis le cache
    const cached = localStorage.getItem("user_cache");
    if (cached) {
      try {
        injectAvatar(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem("user_cache");
      }
    }

    // Appel API en arrière-plan pour rafraîchir le cache
    fetch(`${API_BASE}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_cache");
          window.location.reload();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(user => {
        if (!user) return;
        localStorage.setItem("user_cache", JSON.stringify(user));
        injectAvatar(user);
      })
      .catch(() => {
        if (!cached) {
          document.querySelectorAll(".navAuthLink, #navAuthLink")
            .forEach(el => el.style.visibility = "");
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
