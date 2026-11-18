export function constructionPlugin({ id, name, description, accent, defaults, materials, provisional = false }) {
  // Pricing inputs are demonstration data. The coefficients are per square metre of usable area.
  const factor = 1;
  function estimate(area) {
    const size = Number.isFinite(area) && area > 0 ? area : 0;
    const quantities = materials.map(([kind, label, unit, coefficient, unitPrice, waste]) => {
      const raw = size * coefficient;
      const quantity = unit === 'un' ? Math.ceil(raw * (1 + waste)) : Math.ceil(raw * (1 + waste) * 100) / 100;
      return { kind, label, unit, raw, quantity, unitPrice, waste, amount: Math.round(quantity * unitPrice * 100) / 100 };
    });
    const lines = ['structure', 'envelope', 'interior', 'installation'].map((kind) => ({
      kind,
      amount: Math.round(100 * quantities.filter((item) => item.kind === kind).reduce((sum, item) => sum + item.amount, 0)) / 100,
    }));
    return { total: Math.round(lines.reduce((sum, item) => sum + item.amount, 0) * 100) / 100, quantities, lines };
  }

  return Object.freeze({
    id, name, description, accent, defaults, provisional, estimate, factor,
    rate: estimate(100).total / 100,
  });
}

export function bilingual(pt, en) {
  return { 'pt-PT': pt, 'en-PT': en, 'en-INT': en };
}
