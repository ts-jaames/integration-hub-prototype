/**
 * Slugify utility for generating URL-friendly IDs from text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-+/, '')              // Remove leading hyphens
    .replace(/-+$/, '');             // Remove trailing hyphens
}

/**
 * Generate a unique slug by appending a number suffix if needed
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  existingSlugs.add(slug);
  return slug;
}

