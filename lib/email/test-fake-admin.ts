// Fake mínimo de pbAdmin() para los tests de lib/email/* -- no vale la pena
// levantar una PocketBase real para probar suppression/preferences/send,
// que son lógica pura alrededor de dos o tres llamadas a la colección.
//
// admin.filter(expr, params) en PocketBase real arma un filtro donde
// `{:nombre}` en `expr` es solo un PLACEHOLDER -- el campo real contra el
// que se compara es el que está a la izquierda del "=" en `expr` (ej.
// "provider_message_id = {:id}" compara el campo `provider_message_id`,
// aunque el placeholder se llame `id`). Este fake parsea esas parejas
// campo/placeholder de `expr` en vez de asumir que el nombre del
// placeholder coincide con el del campo -- si no, un filtro como ese
// buscaría por el campo equivocado.
type FakeRecord = Record<string, unknown> & { id: string };

function parseFilter(expr: string, params: Record<string, unknown>): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  const re = /(\w+)\s*=\s*\{:(\w+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(expr))) {
    const [, field, placeholder] = match;
    pairs.push([field, params[placeholder]]);
  }
  return pairs;
}

export function createFakeAdmin(seed: Record<string, FakeRecord[]> = {}) {
  const store: Record<string, FakeRecord[]> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, [...v]]),
  );
  let nextId = 1;

  function filter(expr: string, params: Record<string, unknown>) {
    return JSON.stringify({ expr, params });
  }

  function collection(name: string) {
    return {
      getFirstListItem: async (filterStr: string) => {
        const { expr, params } = JSON.parse(filterStr) as { expr: string; params: Record<string, unknown> };
        const pairs = parseFilter(expr, params);
        const items = store[name] || [];
        const found = items.find((item) => pairs.every(([field, value]) => item[field] === value));
        if (!found) throw new Error("not_found");
        return found;
      },
      create: async (data: Record<string, unknown>) => {
        const record: FakeRecord = { id: `fake_${nextId++}`, ...data };
        store[name] = [...(store[name] || []), record];
        return record;
      },
      update: async (id: string, data: Record<string, unknown>) => {
        const items = store[name] || [];
        const idx = items.findIndex((i) => i.id === id);
        if (idx === -1) throw new Error("not_found");
        items[idx] = { ...items[idx], ...data };
        return items[idx];
      },
    };
  }

  return { filter, collection, _store: store };
}
