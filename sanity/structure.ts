// Custom Sanity Studio structure: pins Site Settings as a singleton at the
// top, lists Services/FAQs/NavItems sorted by `order` ascending (mirrors
// the public site's display order), keeps the rest at default.

import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      // Site Settings as a pinned singleton (one doc per project).
      S.listItem()
        .title("Site Settings")
        .id("siteSettings")
        .child(
          S.document()
            .schemaType("siteSettings")
            .documentId("siteSettings")
            .title("Site Settings"),
        ),
      S.divider(),
      // Document types sorted by `order` field where applicable.
      S.documentTypeListItem("service")
        .title("Services")
        .child(
          S.documentTypeList("service")
            .title("Services")
            .defaultOrdering([{ field: "order", direction: "asc" }]),
        ),
      S.documentTypeListItem("instructor").title("Instructors"),
      S.documentTypeListItem("faq")
        .title("FAQs")
        .child(
          S.documentTypeList("faq")
            .title("FAQs")
            .defaultOrdering([
              { field: "category", direction: "asc" },
              { field: "order", direction: "asc" },
            ]),
        ),
      S.documentTypeListItem("testimonial").title("Testimonials"),
      S.documentTypeListItem("page").title("Pages"),
      S.documentTypeListItem("navItem")
        .title("Navigation")
        .child(
          S.documentTypeList("navItem")
            .title("Navigation")
            .defaultOrdering([{ field: "order", direction: "asc" }]),
        ),
    ]);
