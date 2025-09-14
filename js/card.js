export const CARD_WITH = 220;
export const CARD_HEIGHT = 250;
export const CARD_SCALE = 0.8;

function makeInitials(firstName = "", lastName = "") {
  const f = firstName.trim()[0] || "";
  const l = lastName.trim()[0] || "";
  return (f + l).toUpperCase() || "👤";
}

function formatDates(birthDate, deathDate) {
  const hasBirth = !!birthDate;
  const hasDeath = !!deathDate;
  if (!hasBirth && !hasDeath) return "";
  if (hasBirth && !hasDeath) return `${birthDate}`;
  if (!hasBirth && hasDeath) return `${deathDate}`;
  return `${birthDate} — ${deathDate}`;
}

function createPersonCard(person) {
  if (!person || !person.firstName || !person.lastName) {
    throw new Error("createPersonCard: firstName и lastName обязательны");
  }

  const {
    firstName,
    lastName,
    patronymic = "",
    birthDate = "",
    deathDate = "",
    photoUrl = "",
    badge = "Я",
  } = person;

  const root = document.createElement("article");
  root.className = "person-card";
  root.style.width = `${CARD_WITH}px`;
  root.style.minHeight = `${CARD_HEIGHT}px`;
  root.style.transform = `scale(${CARD_SCALE})`;
  const badgeEl = document.createElement("div");
  badgeEl.className = "person-card__badge";
  badgeEl.textContent = badge;
  root.appendChild(badgeEl);

  const avatar = document.createElement("div");
  avatar.className = "person-card__avatar";
  if (photoUrl) {
    const img = document.createElement("img");
    img.alt = `${lastName} ${firstName}`;
    img.src = photoUrl;
    avatar.appendChild(img);
  } else {
    avatar.textContent = makeInitials(firstName, lastName);
  }
  root.appendChild(avatar);

  const nameEl = document.createElement("h3");
  nameEl.className = "person-card__name";
  nameEl.textContent = patronymic
    ? `${lastName} ${firstName} ${patronymic}`
    : `${lastName} ${firstName}`;
  root.appendChild(nameEl);

  const datesStr = formatDates(birthDate, deathDate);
  if (datesStr) {
    const datesEl = document.createElement("p");
    datesEl.className = "person-card__dates";
    datesEl.textContent = datesStr;
    root.appendChild(datesEl);
  }

  return root;
}

export default { createPersonCard };
