import { CARD_WITH } from "../card.js";

const DEFAULT_CONFIG = {
  rootId: 1,
  levelGap: 180, // расстояние по Y между уровнями
  colGap: 260, // минимальная дистанция между центрами карточек (≈ ширина 240 + отступ)
  spouseGap: 60, // “идеальная” дистанция между супругами (мы используем косвенно)
};

/**
 * @typedef {Object} User
 * @property {number} id - Уникальный идентификатор пользователя
 * @property {string} lastName - Фамилия
 * @property {string} firstName - Имя
 * @property {string} patronymic - Отчество
 * @property {string} birthDate - Дата рождения в формате DD.MM.YYYY
 * @property {'male'|'female'} sex - Пол
 */

/**
 * @typedef {Object} LayoutNode
 * @property {number} id - Уникальный идентификатор пользователя
 * @property {string} lastName - Фамилия
 * @property {string} firstName - Имя
 * @property {string} patronymic - Отчество
 * @property {string} birthDate - Дата рождения в формате DD.MM.YYYY
 * @property {'male'|'female'} sex - Пол
 * @property {number} x - Координата X для позиционирования
 * @property {number} y - Координата Y для позиционирования
 * @property {number} level - Уровень в иерархии семейного дерева
 */

/**
 * @typedef {Object} LayoutUnion
 * @property {number} id - Уникальный идентификатор связи (отрицательный для связей)
 * @property {number} a - ID первого участника связи
 * @property {number} b - ID второго участника связи
 * @property {number} level - Уровень в иерархии семейного дерева
 * @property {number} x - Координата X для позиционирования
 * @property {number} y - Координата Y для позиционирования
 */

/**
 * @typedef {Object} LayoutResult
 * @property {LayoutNode[]} nodes - Массив узлов семейного дерева с координатами
 * @property {LayoutUnion[]} unions - Массив связей между узлами с координатами
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {number} rootId - ID корневого элемента
 * @property {number} levelGap - Расстояние по Y между уровнями
 * @property {number} colGap - Минимальная дистанция между центрами карточек
 * @property {number} spouseGap - Идеальная дистанция между супругами
 */

/**
 * Создает макет семейного дерева с позиционированием узлов и связей
 * @param {User[]} users - Массив пользователей
 * @param {Object[]} relations - Массив связей между пользователями
 * @param {Partial<LayoutConfig>} [options={}] - Опциональные настройки макета
 * @returns {LayoutResult} Объект с массивами nodes и unions
 */
export function layoutFamily(users, relations, options = {}) {
  const cfg = Object.assign(DEFAULT_CONFIG, options);

  const nodes = [];
  const spouses = new Map();

  const rootNode = getRootNode(users, cfg.rootId);
  nodes.push(rootNode);

  relations.forEach((relation) => {
    if (relation.type === "spouse") {
      if (!spouses.has(relation.a)) {
        spouses.set(relation.a, relation.b);
      }
    }
  });

  console.log(spouses);

  const rootSpouse = getRoorSpouse(spouses, cfg.rootId, users);
  console.log(rootSpouse);
  nodes.push(rootSpouse);

  

  return {
    nodes,
  };
}

function getRoorSpouse(spouses, rootId, users) {
  const spouseA = spouses.get(rootId);
  console.log(spouseA);
  const spouseB = users.find((user) => user.id === spouseA);
  return {
    ...spouseB,
    level: 0,
    x: CARD_WITH - 20,
    y: 0,
    badge: "Жена",
  };
}

function getRootNode(users, rootId) {
  const user = users.find((user) => user.id === rootId);
  return {
    ...user,
    x: 0,
    y: 0,
    level: 0,
  };
}

