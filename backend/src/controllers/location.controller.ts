import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_LIMIT = 10;
const NOMINATIM_TIMEOUT_MS = 7000;

const headers = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'EvoriaEventApp/1.0 (contact: support@evoria.app)',
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const searchNominatim = async (query: string, countryCode?: string) => {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    addressdetails: '1',
    limit: String(NOMINATIM_LIMIT),
  });

  if (countryCode) {
    params.set('countrycodes', countryCode);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`);
    }

    const json = await response.json();
    return Array.isArray(json) ? json : [];
  } finally {
    clearTimeout(timeout);
  }
};

export const searchLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      return res.status(200).json({ status: 'success', data: [] });
    }

    let data = await searchNominatim(q, 'lk');

    if (!data || data.length === 0) {
      data = await searchNominatim(q);
    }

    const normalized = (data || [])
      .map((item: any) => {
        const latitude = toFiniteNumber(item?.lat);
        const longitude = toFiniteNumber(item?.lon);
        if (latitude === null || longitude === null) return null;

        const displayName = String(item?.display_name || '').trim();
        const name = String(item?.name || '').trim() || (displayName.split(',')[0] || '').trim();
        const city = String(item?.address?.city || item?.address?.town || item?.address?.village || item?.address?.suburb || '').trim();
        const country = String(item?.address?.country || '').trim();

        return {
          name: name || displayName,
          displayName,
          latitude,
          longitude,
          city,
          country,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      status: 'success',
      data: normalized
    });
  } catch (error) {
    next(new AppError('Failed to search locations', 502));
  }
};
