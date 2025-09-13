import FamilyData from "./data.js";
import { layoutFamily } from "./services/layoutService.js";
import CanvasAPI from "./canvas.js";
import PersonCard from "./card.js";

function renderCards(nodes) {
  const viewport = document.getElementById("viewport");
  if (!viewport) return;
  viewport.innerHTML = "";

  for (const n of nodes) {
    const card = PersonCard.createPersonCard({
      firstName: n.firstName,
      lastName: n.lastName,
      patronymic: n.patronymic,
      birthDate: n.birthDate,
      deathDate: n.deathDate,
      photoUrl: n.photoUrl,
      badge: n.id === 1 ? "Я" : n.badge || "",
    });
    CanvasAPI.addToViewport(card, n.x, n.y);
  }
}

function initHeaderBurger() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav--open");
    burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    const clickInside = nav.contains(e.target) || burger.contains(e.target);
    if (!clickInside && nav.classList.contains("nav--open")) {
      nav.classList.remove("nav--open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720 && nav.classList.contains("nav--open")) {
      nav.classList.remove("nav--open");
      burger.setAttribute("aria-expanded", "false");
    }
  });
}

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

function main() {
  setYear();
  initHeaderBurger();

  // Инициализация полотна
  CanvasAPI.initCanvas();

  // Раскладка
  const nodes = layoutFamily(FamilyData.users, FamilyData.relations, {
    rootId: 1, // Дмитрий
    levelGap: 180, // можно поиграть
    colGap: 280,
  });

  // Рендер карточек
  renderCards(nodes);

  // Центровка
  CanvasAPI.centerViewport();
}

main();
