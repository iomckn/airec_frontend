from flask import Flask, render_template, url_for, request
from test import separer_genre, trouver_film_par_categories

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/categories', methods=["GET", "POST"])
def categories():
    genres = separer_genre()
    films = []
    selected = []
    if request.method == "POST":
        selected = request.form.getlist("genres")
        films = trouver_film_par_categories(selected)
    return render_template('categories.html', genres = sorted(separer_genre())[1:], films=films, selected=selected)

if __name__ == "__main__":
    app.run(debug=True)