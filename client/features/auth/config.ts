import { AUTH_MAX_TAGS, SYSTEM_AVATAR_IDS } from '@shared/auth';
import { apiUrl } from '@shared/apiClient';

/** Editable presentation choices. Stable IDs and business limits are shared with the server. */
export const authPresentation = {
  heroImage: '/auth/social-editorial.png',
  transitionSeconds: .26,
  maxTags: AUTH_MAX_TAGS,
  suggestedTags: 3,
  avatars: SYSTEM_AVATAR_IDS.map((id, index) => ({ id, color: ['#f4cab9','#d9d0ef','#cddac1','#e9d298'][index], url: apiUrl(`/api/auth/avatars/system/${id}.svg`) })),
  tagGroups: [
    { id: 'games', tags: ['valorant','pubg','fc','ml'] },
    { id: 'vibes', tags: ['chill','ranked','voice','night'] },
    { id: 'life', tags: ['music','anime','football','coffee'] },
  ],
};
