/**
 * In seethespecs this pointed at the Go API, because images lived on a CDN and
 * some stored URLs were relative to it. A buildsheet site serves its own images
 * from its own directory, so the prefix is deliberately empty and the renderers
 * are left otherwise untouched.
 */
export const API_BASE_URL = '';
