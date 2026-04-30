import { API_URL } from '../constants/api';

const apiOrigin = API_URL.replace(/\/api\/?$/, '');

export const resolveImageUrl = (imagePath?: string | null) => {
  if (!imagePath) {
    return undefined;
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  if (imagePath.startsWith('/')) {
    return `${apiOrigin}${imagePath}`;
  }

  return `${apiOrigin}/${imagePath}`;
};
