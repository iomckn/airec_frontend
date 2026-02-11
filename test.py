import pandas as pd
import os

def separer_genre():
    movies = pd.read_csv("movies.csv", sep=",")
    genres = movies["genres"].unique()
    genre_individuel = []
    for x in genres:
        genre_split = x.split("|")
        for y in genre_split:
            genre_individuel.append(y.strip())

    return list(set(genre_individuel))

def trouver_film_par_categories(genre):
    film_a_garder = []
    movies = pd.read_csv("movies.csv", sep=",")
    for _, row in movies.iterrows():
        cat = row["genres"].split('|')
        if all(g in cat for g in genre):
            film_a_garder.append(row["title"])         
    return film_a_garder

