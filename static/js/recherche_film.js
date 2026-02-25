// ----- étoiles cliquables -----
const starButtons = document.querySelectorAll("#userStars .star-btn");
const ratingValue = document.getElementById("ratingValue");
const myScore = document.getElementById("myScore");

function paintStars(value){
  starButtons.forEach(btn => {
    const v = Number(btn.dataset.value);
    btn.classList.toggle("filled", v <= value);
  });
}

starButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = Number(btn.dataset.value);
    ratingValue.value = String(value);
    myScore.textContent = String(value);
    paintStars(value);
  });
});

// ----- carousel flèches -----
const track = document.getElementById("track");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function scrollByOneCard(direction){
  const firstItem = track.querySelector(".car-item");
  if(!firstItem) return;

  const gap = 26; // doit matcher le CSS gap
  const amount = firstItem.getBoundingClientRect().width + gap;

  track.scrollBy({ left: direction * amount, behavior: "smooth" });
}

prevBtn.addEventListener("click", () => scrollByOneCard(-1));
nextBtn.addEventListener("click", () => scrollByOneCard(1));