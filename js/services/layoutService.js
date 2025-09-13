// js/services/layoutService.js
/**
 * Простая раскладка по уровням (поколениям) с учётом супругов.
 * Возвращает массив пользователей, обогащённых координатами { x, y, level }.
 *
 * Алгоритм (минимально жизнеспособный):
 * 1) Строим индексы: дети по родителю, родители по ребёнку, пары супругов.
 * 2) Назначаем уровни относительно корня (rootId): предки в -1, -2..., потомки в +1, +2...
 * 3) Для каждого уровня слева направо выставляем x с одинаковым шагом.
 *    Порядок внутри уровня: сортируем по среднему индексу родителей (если есть), иначе по фамилии.
 * 4) Возврат: nodes[] c координатами.
 */
export function layoutFamily(users, relations, options = {}) {
  const cfg = Object.assign({
    rootId: 1,
    levelGap: 160,     // расстояние по Y между уровнями
    colGap: 280,       // расстояние по X между карточками (ширина 240 + 40)
  }, options);

  // --- Индексы ---
  const byId = new Map(users.map(u => [u.id, { ...u }]));
  const childrenByParent = new Map(); // parentId -> Set(childId)
  const parentsByChild = new Map();   // childId -> Set(parentId)
  const spousePairs = new Set();      // "a-b" (a<b)

  for (const r of relations) {
    if (r.type === 'parent') {
      if (!childrenByParent.has(r.parent)) childrenByParent.set(r.parent, new Set());
      childrenByParent.get(r.parent).add(r.child);

      if (!parentsByChild.has(r.child)) parentsByChild.set(r.child, new Set());
      parentsByChild.get(r.child).add(r.parent);
    } else if (r.type === 'spouse') {
      const a = Math.min(r.a, r.b);
      const b = Math.max(r.a, r.b);
      spousePairs.add(`${a}-${b}`);
    }
  }

  const level = new Map(); // id -> level (0 у root)
  level.set(cfg.rootId, 0);

  // --- Поднимаемся к предкам ---
  const upQueue = [cfg.rootId];
  while (upQueue.length) {
    const cur = upQueue.shift();
    const curLvl = level.get(cur);
    const parents = parentsByChild.get(cur);
    if (!parents) continue;
    for (const p of parents) {
      if (!level.has(p)) {
        level.set(p, curLvl - 1);
        upQueue.push(p);
      }
    }
  }

  // --- Идём к потомкам ---
  const downQueue = [cfg.rootId];
  while (downQueue.length) {
    const cur = downQueue.shift();
    const curLvl = level.get(cur);
    const kids = childrenByParent.get(cur);
    if (!kids) continue;
    for (const c of kids) {
      if (!level.has(c)) {
        level.set(c, curLvl + 1);
        downQueue.push(c);
      }
    }
  }

  // Если кто-то остался без уровня (оторванная компонента) — ставим к корню
  for (const id of byId.keys()) {
    if (!level.has(id)) level.set(id, 0);
  }

  // --- Группировка по уровням ---
  const levels = new Map(); // lvl -> id[]
  for (const [id, lvl] of level.entries()) {
    if (!levels.has(lvl)) levels.set(lvl, []);
    levels.get(lvl).push(id);
  }

  const minLvl = Math.min(...levels.keys());
  const maxLvl = Math.max(...levels.keys());

  // --- Выставление X внутри уровня ---
  // Сначала вычислим "ключ сортировки" — средний индекс родителей на верхнем уровне
  const positioned = new Map(); // id -> { x, y, level }

  // Первый проход: расставляем уровни последовательно сверху вниз (от minLvl к maxLvl)
  let currentSlots = new Map(); // lvl -> nextXSlotIndex (целое)
  function nextX(lvl) {
    const idx = currentSlots.get(lvl) || 0;
    currentSlots.set(lvl, idx + 1);
    return idx;
  }

  // Для сортировки внутри уровня нам нужен порядок родителей.
  // Будем сортировать: 1) по среднему X родителей (если уже известны), 2) по фамилии.
  const safeName = (id) => {
    const u = byId.get(id) || {};
    return `${u.lastName || ''} ${u.firstName || ''}`.trim();
  };

  for (let lvl = minLvl; lvl <= maxLvl; lvl++) {
    const ids = (levels.get(lvl) || []).slice();

    ids.sort((a, b) => {
      const aParents = parentsByChild.get(a);
      const bParents = parentsByChild.get(b);

      const aKey = averageParentX(aParents);
      const bKey = averageParentX(bParents);

      if (aKey !== null && bKey !== null) return aKey - bKey;
      if (aKey !== null) return -1;
      if (bKey !== null) return  1;

      return safeName(a).localeCompare(safeName(b), 'ru');
    });

    // Расставляем x по слоту
    ids.forEach(id => {
      const xSlot = nextX(lvl);
      const x = xSlot * cfg.colGap;
      const y = (lvl - 0) * cfg.levelGap; // root на 0
      positioned.set(id, { id, x, y, level: lvl });
    });
  }

  // В конце центрируем относительно корня по X (корень в нулевом x)
  const rootPos = positioned.get(cfg.rootId);
  if (rootPos) {
    const shift = -rootPos.x;
    for (const pos of positioned.values()) pos.x += shift;
  }

  // Вернём обогащённые узлы в исходном порядке users (но это не обязательно)
  const nodes = users.map(u => ({
    ...u,
    ...(positioned.get(u.id) || { x: 0, y: 0, level: 0 }),
  }));

  return nodes;

  // ---- helpers ----
  function averageParentX(parentsSet) {
    if (!parentsSet || !parentsSet.size) return null;
    const xs = [];
    for (const p of parentsSet) {
      const pos = positioned.get(p);
      if (pos) xs.push(pos.x);
    }
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }
}
