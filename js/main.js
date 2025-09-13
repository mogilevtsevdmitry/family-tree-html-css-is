// main.js
const SELECTORS = {
  year: '#year',
  burger: '#burger',
  nav: '#nav',
};

function $(selector) {
  return document.querySelector(selector);
}

function setCurrentYear() {
  const el = $(SELECTORS.year);
  if (el) el.textContent = new Date().getFullYear();
}

function bindBurgerClick(burger, nav) {
  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function bindOutsideClick(burger, nav) {
  document.addEventListener('click', (e) => {
    const clickInside = nav.contains(e.target) || burger.contains(e.target);
    if (!clickInside && nav.classList.contains('nav--open')) {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

function bindResizeClose(burger, nav) {
  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && nav.classList.contains('nav--open')) {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

function initBurgerMenu() {
  const burger = $(SELECTORS.burger);
  const nav = $(SELECTORS.nav);
  if (!burger || !nav) return;

  bindBurgerClick(burger, nav);
  bindOutsideClick(burger, nav);
  bindResizeClose(burger, nav);
}

function addDefaultCard() {
  const me = {
    firstName: 'Дмитрий',
    lastName: 'Могилевцев',
    // patronymic: 'Александрович',
    // birthDate: '25.03.1991',
    // deathDate: '',
    // photoUrl: '.../avatar.jpg',
    badge: 'Я',
  };
  const card = window.PersonCard.createPersonCard(me);
  window.CanvasAPI.addToViewport(card, 0, 0);
}

function main() {
  setCurrentYear();
  initBurgerMenu();
  window.CanvasAPI.initCanvas();
  addDefaultCard();
}

main();
