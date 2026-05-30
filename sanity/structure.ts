// Custom Sanity Studio structure: pins Site Settings as a singleton at the
// top, lists Services/FAQs/NavItems sorted by `order` ascending (mirrors
// the public site's display order), keeps the rest at default.

import type { StructureResolver } from "sanity/structure";
import { orderableDocumentListDeskItem } from "@sanity/orderable-document-list";

export const structure: StructureResolver = (S, context) =>
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
      // Services: drag-to-reorder list (position stored in orderRank).
      orderableDocumentListDeskItem({
        type: "service",
        title: "Services",
        S,
        context,
      }),
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
