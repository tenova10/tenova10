export function lev(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
  return d[m][n]
}

export function fuzzy(name, desc, q) {
  if (!q.trim()) return true
  const text = (name + ' ' + (desc || '')).toLowerCase()
  const query = q.toLowerCase()
  if (text.includes(query)) return true
  return query.split(' ').every(qw =>
    text.split(' ').some(tw => lev(tw, qw) <= 2)
  )
}