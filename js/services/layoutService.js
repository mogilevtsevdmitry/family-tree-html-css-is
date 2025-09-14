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

  const rootSpouse = getRoorSpouse(spouses, cfg.rootId, users);
  nodes.push(rootSpouse);

  // Запускаем построение от корневого узла
  buildParents(cfg.rootId, 0, 0, relations, users, nodes, cfg);

  // Запускаем построение детей от корневого узла
  buildChildren(cfg.rootId, 0, 0, relations, users, nodes, cfg);

  return {
    nodes,
  };
}

// Рекурсивно строим детей для узла
function buildChildren(parentId, level, centerX, relations, users, nodes, cfg) {
  const childRelations = relations.filter(
    (rel) => rel.type === "parent" && rel.parent === parentId
  );

  if (!childRelations.length) return;

  // Находим детей
  const childIds = childRelations.map((rel) => rel.child);
  const children = users.filter((user) => childIds.includes(user.id));
  // Находим родителей для детей
  const parents = relations
    .filter(rel => rel.type === "parent" && childIds.includes(rel.child))
    .map(rel => rel.parent);

  // Находим уникальных родителей
  const uniqueParents = [...new Set(parents)];

  // Если у детей несколько родителей, центрируем их между родителями
  if (uniqueParents.length > 1) {
    // Находим координаты X родителей
    const parentNodes = nodes.filter(n => uniqueParents.includes(n.id));
    const parentXCoords = parentNodes.map(p => p.x).sort((a, b) => a - b);
    
    // Вычисляем центр между крайними родителями
    const leftmostParentX = parentXCoords[0];
    const rightmostParentX = parentXCoords[parentXCoords.length - 1];
    centerX = (leftmostParentX + rightmostParentX) / 2;
  }

  if (children.length === 1) {
    // Если один ребенок - размещаем по центру под родителем
    const child = {
      ...children[0],
      level: level + 1,
      x: centerX,
      y: (level + 1) * cfg.levelGap,
    };
    nodes.push(child);

    // Ищем детей для текущего ребенка
    buildChildren(child.id, level + 1, child.x, relations, users, nodes, cfg);
  } else if (children.length > 1) {
    // Если несколько детей - размещаем равномерно под родителем
    const gap = cfg.colGap;
    const totalWidth = (children.length - 1) * gap;
    const startX = centerX - totalWidth / 2;

    children.forEach((child, index) => {
      const childNode = {
        ...child,
        level: level + 1,
        x: startX + index * gap,
        y: (level + 1) * cfg.levelGap,
      };
      nodes.push(childNode);

      // Рекурсивно строим для каждого ребенка
      buildChildren(
        childNode.id,
        level + 1,
        childNode.x,
        relations,
        users,
        nodes,
        cfg
      );
    });
  }
}

// Рекурсивно строим родителей для корневого узла
function buildParents(childId, level, centerX, relations, users, nodes, cfg) {
  const parentRelations = relations.filter(
    (rel) => rel.type === "parent" && rel.child === childId
  );

  if (!parentRelations.length) return;

  // Находим родителей
  const parentIds = parentRelations.map((rel) => rel.parent);
  const parents = users.filter((user) => parentIds.includes(user.id));

  if (parents.length === 1) {
    // Если один родитель - размещаем по центру над ребенком
    const parent = {
      ...parents[0],
      level: level - 1,
      x: centerX,
      y: (level - 1) * cfg.levelGap,
    };
    nodes.push(parent);

    // Ищем родителей для текущего родителя
    buildParents(parent.id, level - 1, parent.x, relations, users, nodes, cfg);
  } else if (parents.length === 2) {
    // Если два родителя - размещаем симметрично над ребенком
    const leftParent = {
      ...parents[0],
      level: level - 1,
      x: centerX - CARD_WITH / 2 + 10,
      y: (level - 1) * cfg.levelGap,
    };

    const rightParent = {
      ...parents[1],
      level: level - 1,
      x: centerX + CARD_WITH / 2 - 10,
      y: (level - 1) * cfg.levelGap,
    };

    nodes.push(leftParent, rightParent);

    // Рекурсивно строим для каждого родителя
    buildParents(
      leftParent.id,
      level - 1,
      leftParent.x,
      relations,
      users,
      nodes,
      cfg
    );
    buildParents(
      rightParent.id,
      level - 1,
      rightParent.x,
      relations,
      users,
      nodes,
      cfg
    );
  }
}

function getRoorSpouse(spouses, rootId, users) {
  const spouseA = spouses.get(rootId);
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
