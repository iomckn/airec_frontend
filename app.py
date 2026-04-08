import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from flask import Flask, render_template, url_for, request
from test import separer_genre, trouver_film_par_categories

app = Flask(__name__)
API_BASE = "https://airec-api.randever.com"


def api_get(path, params=None):
    url = f"{API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    try:
        req = Request(url, headers={"Accept": "application/json"})
        with urlopen(req, timeout=10) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except (HTTPError, URLError, json.JSONDecodeError, ValueError):
        return None


def extract_list(payload, keys):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in keys:
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def extract_categories(payload):
    values = extract_list(payload, ("categories", "genres", "data", "results", "items"))
    categories = []

    for value in values:
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                categories.append(cleaned)
        elif isinstance(value, dict):
            for key in ("name", "genre", "title", "label"):
                cleaned = str(value.get(key, "")).strip()
                if cleaned:
                    categories.append(cleaned)
                    break

    return sorted(set(categories))


def extract_movies(payload):
    return extract_list(payload, ("movies", "recommendations", "results", "data", "items"))


def normalize_movie(movie):
    if not isinstance(movie, dict):
        return {
            "title": str(movie),
            "movie_id": None,
            "poster_url": "",
            "release_year": "",
            "genres": [],
            "description": "",
            "average_rating": 0,
        }

    genres = movie.get("genres") or []
    if isinstance(genres, str):
        genres = [genre.strip() for genre in genres.split("|") if genre.strip()]

    return {
        "title": movie.get("title") or movie.get("name") or movie.get("titre") or "Film",
        "movie_id": movie.get("id") or movie.get("movie_id"),
        "poster_url": movie.get("poster_url") or movie.get("poster") or "",
        "release_year": movie.get("release_year") or movie.get("year") or movie.get("annee") or "",
        "genres": genres,
        "description": movie.get("description") or movie.get("overview") or "",
        "average_rating": movie.get("average_rating") or movie.get("rating") or 0,
    }


def fetch_categories_from_api():
    payload = api_get("/api/categories")
    if payload is None:
        return None
    return extract_categories(payload)


def fetch_movies_for_selected_categories(selected_categories):
    if not selected_categories:
        return []

    common_keys = None
    movie_index = {}

    for category in selected_categories:
        payload = api_get(f"/api/categories/{quote(category, safe='')}/movies", {"page": 1, "sort_by": "rating"})
        if payload is None:
            return None

        movies = extract_movies(payload)
        keys_for_category = set()

        for movie in movies:
            normalized = normalize_movie(movie)
            movie_key = normalized["movie_id"] or normalized["title"]
            if not movie_key:
                continue
            movie_index[movie_key] = normalized
            keys_for_category.add(movie_key)

        common_keys = keys_for_category if common_keys is None else common_keys & keys_for_category

    if not common_keys:
        return []

    return [movie_index[key] for key in sorted(common_keys, key=lambda key: movie_index[key]["title"].lower())]


@app.route('/')
def index():
    return render_template('index.html')


@app.route("/login", methods=["GET", "POST"])
def login():
    return render_template("login.html")

@app.route("/recherche_film")
def recherche_film():
    query = request.args.get("q")  # récupère ce qui a été tapé
    return render_template("recherche_film.html", query=query)

@app.route('/film/<int:movie_id>')
def film_detail(movie_id):
    return render_template('recherche_film.html')

@app.route('/categories', methods=["GET", "POST"])
def categories():
    genres = fetch_categories_from_api()
    if not genres:
        genres = sorted(separer_genre())

    films = []
    selected = []
    api_source = "API"

    if request.method == "POST":
        selected = [genre for genre in request.form.getlist("genres") if genre]
        films = fetch_movies_for_selected_categories(selected)

        if films is None:
            films = [normalize_movie(title) for title in trouver_film_par_categories(selected)]
            api_source = "CSV"

    return render_template(
        'categories.html',
        genres=genres,
        films=films,
        selected=selected,
        api_source=api_source,
    )

if __name__ == "__main__":
    app.run(debug=True)