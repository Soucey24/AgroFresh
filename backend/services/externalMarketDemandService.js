const REQUEST_TIMEOUT_MS = Number(process.env.MARKET_DEMAND_API_TIMEOUT || 8000);

const getExternalRecords = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.candidateLocations)) return payload.candidateLocations;
  if (Array.isArray(payload?.locations)) return payload.locations;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const fetchExternalMarketDemand = async (cropType) => {
  const endpoint = process.env.MARKET_DEMAND_API_URL;
  if (!endpoint) return { available: false, provider: 'internal fallback', records: [] };
  let timeout;

  try {
    const url = new URL(endpoint);
    url.searchParams.set('crop_type', cropType);
    url.searchParams.set('country', process.env.MARKET_DEMAND_COUNTRY || 'Ghana');

    const headers = { Accept: 'application/json' };
    if (process.env.MARKET_DEMAND_API_KEY) {
      headers.Authorization = `Bearer ${process.env.MARKET_DEMAND_API_KEY}`;
    }

    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`External market provider returned ${response.status}`);
    const payload = await response.json();
    const records = getExternalRecords(payload)
      .map((record) => ({
        location: String(record.location || record.name || record.region || '').trim(),
        externalDemandScore: Number(record.demandScore ?? record.demand_score ?? record.predictedDemandScore ?? record.score ?? 0),
      }))
      .filter((record) => record.location && Number.isFinite(record.externalDemandScore));

    return { available: records.length > 0, provider: process.env.MARKET_DEMAND_PROVIDER || 'external market provider', records };
  } catch (error) {
    console.warn('[market-demand] External provider unavailable:', error.message);
    return { available: false, provider: 'internal fallback', records: [] };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
