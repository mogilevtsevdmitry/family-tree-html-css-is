// js/services/layoutService.js
/**
 * Раскладка семейного дерева:
 * - Ввод: users[], relations[]; options { rootId, levelGap, colGap, spouseGap }
 * - Вывод: nodes[] (только люди) c { x, y, level }, unions[] (виртуальные) c { id, a, b, x, y, level }
 *
 * Идея:
 * 1) Индексация родителей/детей/супругов.
 * 2) Назначение уровней относительно rootId (предки < 0, root = 0, потомки > 0).
 * 3) Создание союзов супругов (union) + “сингл-parent” союзов для одиночных родителей.
 * 4) Двухпроходная раскладка по уровням (сверху вниз):
 *    - ключ сортировки — центр родителей (union.x или среднее X родителей), fallback — ФИ.
 *    - анти-пересечения на уровне (не даём карточкам наезжать).
 * 5) После первого прохода вычисляем x союзов как среднее x супругов.
 * 6) Второй проход по потомкам: подтягиваем детей под union.x и снова устраняем пересечения.
 * 7) Центрируем всё по корню (x(root)=0).
 */
export function layoutFamily(users, relations, options = {}) {
  const cfg = Object.assign(
    {
      rootId: 1,
      levelGap: 180,   // расстояние по Y между уровнями
      colGap: 280,     // минимальная дистанция между центрами карточек (≈ ширина 240 + отступ)
      spouseGap: 80,   // “идеальная” дистанция между супругами (мы используем косвенно)
    },
    options
  );

  // ---------- 1) Индексы ----------
  const byId = new Map(users.map(u => [u.id, { ...u }]));
  const childrenByParent = new Map(); // parentId -> Set(childId)
  const parentsByChild = new Map();   // childId -> Set(parentId)
  const spouses = new Map();          // id -> Set(spouseId)
  const spousePairs = [];             // [{a,b}]

  for (const r of relations) {
    if (r.type === 'parent') {
      if (!childrenByParent.has(r.parent)) childrenByParent.set(r.parent, new Set());
      childrenByParent.get(r.parent).add(r.child);

      if (!parentsByChild.has(r.child)) parentsByChild.set(r.child, new Set());
      parentsByChild.get(r.child).add(r.parent);
    } else if (r.type === 'spouse') {
      if (!spouses.has(r.a)) spouses.set(r.a, new Set());
      if (!spouses.has(r.b)) spouses.set(r.b, new Set());
      spouses.get(r.a).add(r.b);
      spouses.get(r.b).add(r.a);

      const a = Math.min(r.a, r.b);
      const b = Math.max(r.a, r.b);
      spousePairs.push({ a, b });
    }
  }

  // ---------- 2) Уровни ----------
  const level = new Map(); // id -> level
  level.set(cfg.rootId, 0);
  // вверх (к предкам)
  const upQ = [cfg.rootId];
  while (upQ.length) {
    const cur = upQ.shift();
    const curLvl = level.get(cur);
    const ps = parentsByChild.get(cur);
    if (!ps) continue;
    for (const p of ps) {
      if (!level.has(p)) {
        level.set(p, curLvl - 1);
        upQ.push(p);
      }
    }
  }
  // вниз (к потомкам)
  const dnQ = [cfg.rootId];
  while (dnQ.length) {
    const cur = dnQ.shift();
    const curLvl = level.get(cur);
    const kids = childrenByParent.get(cur);
    if (!kids) continue;
    for (const c of kids) {
      if (!level.has(c)) {
        level.set(c, curLvl + 1);
        dnQ.push(c);
      }
    }
  }
  // висячие — к уровню 0
  for (const id of byId.keys()) if (!level.has(id)) level.set(id, 0);

  // ---------- 3) Союзы супругов (union) и сингл-parent союзы ----------
  // unionId делаем отрицательными, чтобы не пересекаться с id людей
  let unionSeq = -1;
  const unionBySpousePairKey = new Map(); // "a-b" -> unionId
  const unions = []; // { id, a, b, level, x?, y? }
  function makeUnion(a, b = null) {
    // a<b для стабильного ключа
    const key = b != null ? `${Math.min(a, b)}-${Math.max(a, b)}` : `solo-${a}`;
    if (unionBySpousePairKey.has(key)) {
      return unionBySpousePairKey.get(key);
    }
    const id = unionSeq--; // -1, -2, ...
    // уровень союза: если есть оба супруга — среднее (округлим к ближайшему)
    let lvl;
    if (b != null) {
      const la = level.get(a) ?? 0;
      const lb = level.get(b) ?? 0;
      // чаще всего супруги на одном уровне; если нет — берём ближе к большему (потомкам)
      lvl = Math.round((la + lb) / 2);
    } else {
      lvl = level.get(a) ?? 0;
    }
    unionBySpousePairKey.set(key, id);
    unions.push({ id, a, b, level: lvl });
    return id;
  }

  // Союзы для указанных пар супругов
  for (const { a, b } of spousePairs) makeUnion(a, b);

  // map: childId -> unionId родителей (или сингл-union)
  const parentUnionOfChild = new Map();
  for (const [child, psSet] of parentsByChild.entries()) {
    const ps = [...psSet];
    if (ps.length >= 2) {
      // ищем среди родителей супружескую пару
      let uId = null;
      for (let i = 0; i < ps.length && uId == null; i++) {
        for (let j = i + 1; j < ps.length && uId == null; j++) {
          const a = Math.min(ps[i], ps[j]);
          const b = Math.max(ps[i], ps[j]);
          const key = `${a}-${b}`;
          if (unionBySpousePairKey.has(key)) uId = unionBySpousePairKey.get(key);
        }
      }
      if (uId == null) {
        // родителей двое, но в данных нет marriage-связи — делаем “виртуальный” union по этим двоим
        uId = makeUnion(ps[0], ps[1]);
      }
      parentUnionOfChild.set(child, uId);
    } else if (ps.length === 1) {
      // одиночный родитель
      const uId = makeUnion(ps[0], null);
      parentUnionOfChild.set(child, uId);
    }
  }

  // ---------- 4) Первый проход по уровням (сверху вниз) ----------
  const levels = groupByLevel(users, level); // Map<lvl, id[]>
  const minLvl = Math.min(...levels.keys());
  const maxLvl = Math.max(...levels.keys());

  const positioned = new Map(); // id -> {x,y,level}
  // вспомогательные кеши: x родителей/union'ов
  const unionX = new Map(); // unionId -> x

  for (let lvl = minLvl; lvl <= maxLvl; lvl++) {
    const ids = (levels.get(lvl) || []).slice();

    // ключ сортировки: центр родителей, потом ФИ
    ids.sort((a, b) => {
      const ka = parentCenterKey(a);
      const kb = parentCenterKey(b);
      if (ka != null && kb != null && ka !== kb) return ka - kb;
      if (ka != null && kb == null) return -1;
      if (ka == null && kb != null) return 1;
      return safeName(a).localeCompare(safeName(b), 'ru');
    });

    // расстановка по x с анти-пересечениями
    const row = [];
    for (const id of ids) {
      const desired = parentCenterKey(id);
      row.push({ id, desired });
    }
    placeRow(row, lvl, positioned, cfg);
  }

  // ---------- 5) Позиции союзов по среднему X супругов ----------
  for (const u of unions) {
    if (u.b != null) {
      const pa = positioned.get(u.a);
      const pb = positioned.get(u.b);
      if (pa && pb) {
        unionX.set(u.id, (pa.x + pb.x) / 2);
      }
    } else {
      const pa = positioned.get(u.a);
      if (pa) unionX.set(u.id, pa.x);
    }
  }

  // ---------- 6) Второй проход для потомков: тянем к union.x и разруливаем пересечения ----------
  for (let lvl = Math.max(1, minLvl); lvl <= maxLvl; lvl++) {
    const ids = (levels.get(lvl) || []).slice();
    if (!ids.length) continue;

    // ключ сортировки — x их родительского союза/родителей
    ids.sort((a, b) => {
      const ka = parentCenterKey(a, /*preferUnion*/ true);
      const kb = parentCenterKey(b, /*preferUnion*/ true);
      if (ka != null && kb != null && ka !== kb) return ka - kb;
      if (ka != null && kb == null) return -1;
      if (ka == null && kb != null) return 1;
      return safeName(a).localeCompare(safeName(b), 'ru');
    });

    const row = [];
    for (const id of ids) {
      const desired = parentCenterKey(id, /*preferUnion*/ true);
      row.push({ id, desired });
    }
    placeRow(row, lvl, positioned, cfg);
  }

  // ---------- 7) Центрируем по корню ----------
  const rootPos = positioned.get(cfg.rootId);
  if (rootPos) {
    const shift = -rootPos.x;
    for (const pos of positioned.values()) pos.x += shift;
    for (const [uid, x] of unionX.entries()) unionX.set(uid, x + shift);
  }

  // соберём выходные узлы
  const nodes = users.map(u => {
    const p = positioned.get(u.id) || { x: 0, y: 0, level: 0 };
    return { ...u, x: p.x, y: p.y, level: p.level };
  });
  // финальные y союзов
  for (const u of unions) {
    u.x = unionX.get(u.id) ?? 0;
    u.y = (u.level - 0) * cfg.levelGap;
  }

  return { nodes, unions };

  // ===== helpers =====
  function safeName(id) {
    const u = byId.get(id) || {};
    return `${u.lastName || ''} ${u.firstName || ''}`.trim();
  }

  /**
   * Ключ “центра родителей”:
   * - Если preferUnion=true и есть parentUnionOfChild -> x этого union (если известен) или среднее x родителей.
   * - Иначе среднее x родителей (если посчитаны).
   * - Иначе null.
   */
  function parentCenterKey(id, preferUnion = false) {
    // если есть union-родителей
    const uId = parentUnionOfChild.get(id);
    if (preferUnion && uId != null) {
      const ux = unionX.get(uId);
      if (ux != null) return ux;
      // если x союза ещё не известен — падаем к среднему родителей
    }
    const ps = parentsByChild.get(id);
    if (!ps || ps.size === 0) return null;
    const xs = [];
    for (const p of ps) {
      const pos = positioned.get(p);
      if (pos) xs.push(pos.x);
    }
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  function groupByLevel(users, levelMap) {
    const map = new Map();
    for (const u of users) {
      const lvl = levelMap.get(u.id) ?? 0;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl).push(u.id);
    }
    return map;
  }

  /**
   * Рассадка ряда с анти-пересечениями (жадная):
   * - если есть desired (центр родителей) — стремимся к нему,
   * - иначе ставим по порядку в слоты,
   * - при наезде двигаем вправо минимум на colGap.
   */
  function placeRow(rowItems, lvl, positioned, cfg) {
    let cursorX = Number.NEGATIVE_INFINITY;

    // черновая расстановка (без принудительной сетки), но с “не наезжать”
    for (let i = 0; i < rowItems.length; i++) {
      const { id, desired } = rowItems[i];
      // первичный x
      let x = desired != null ? desired : i * cfg.colGap;

      // анти-пересечение: текущий не левее предыдущего + colGap
      if (x <= cursorX + cfg.colGap) {
        x = cursorX + cfg.colGap;
      }
      cursorX = x;

      const y = (lvl - 0) * cfg.levelGap;
      positioned.set(id, { id, x, y, level: lvl });
    }

    // попытка “поджать” слева, если все ушли вправо (легкая центровка ряда)
    if (rowItems.length > 1) {
      const firstId = rowItems[0].id;
      const lastId = rowItems[rowItems.length - 1].id;
      const width = positioned.get(lastId).x - positioned.get(firstId).x;
      const idealCenter = averageDesired(rowItems);
      if (idealCenter != null) {
        // хотим, чтобы центр ряда был рядом с средним desired
        const actualCenter = positioned.get(firstId).x + width / 2;
        const shift = idealCenter - actualCenter;
        // сдвигаем весь ряд (но не нарушаем глобальные анти-пересечения межуровневые)
        for (const { id } of rowItems) {
          const pos = positioned.get(id);
          positioned.set(id, { ...pos, x: pos.x + shift });
        }
      }
    }
  }

  function averageDesired(rowItems) {
    const arr = rowItems.map(it => it.desired).filter(v => v != null);
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
