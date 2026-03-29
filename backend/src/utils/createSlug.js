import slugify from "slugify";

export function createSlug(value) {
  return slugify(value, {
    lower: true,
    strict: true,
    trim: true
  });
}

