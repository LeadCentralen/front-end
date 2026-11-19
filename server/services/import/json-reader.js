// JSON-läsare: array, objekt med en array, eller NDJSON (en post per rad).
export async function* jsonRecords(buffer) {
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { yield JSON.parse(line); } catch { /* hoppa över */ }
    }
    return;
  }
  if (!Array.isArray(data)) {
    const arr = Object.values(data).find(Array.isArray);
    data = arr || [data];
  }
  for (const item of data) if (item && typeof item === 'object') yield item;
}
