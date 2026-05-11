// Sanity schema registry. Add new types here so Sanity Studio picks them up.

import type { SchemaTypeDefinition } from "sanity";

// Embedded object types (used inside documents, not stored alone)
import { brand } from "./objects/brand";
import { cta } from "./objects/cta";
import { seo } from "./objects/seo";

// Document types (top-level, each is its own editable record)
import { faq } from "./documents/faq";
import { instructor } from "./documents/instructor";
import { navItem } from "./documents/navItem";
import { page } from "./documents/page";
import { service } from "./documents/service";
import { siteSettings } from "./documents/siteSettings";
import { testimonial } from "./documents/testimonial";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Objects first so documents can reference them
  brand,
  cta,
  seo,

  // Documents
  siteSettings,
  service,
  instructor,
  faq,
  testimonial,
  page,
  navItem,
];
