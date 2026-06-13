// Custom Sanity Studio input that shows a live character count under the
// default field, so editors can see how long a meta title or description is
// without counting by hand. Used by sanity/schemas/objects/seo.ts.
//
// CAPS is the hard limit per field (matches the schema validation .max()).
// The count turns red once you go over. Length GUIDANCE (and the note that the
// business name is auto-appended to titles) lives in each field's description,
// because the right target depends on context.

import type { StringInputProps, TextInputProps } from "sanity";

const CAPS: Record<string, number> = {
  metaTitle: 60,
  metaDescription: 160,
};

export function CharacterCountInput(props: StringInputProps | TextInputProps) {
  const length = (props.value ?? "").length;
  const cap = CAPS[props.schemaType.name];
  const over = typeof cap === "number" && length > cap;

  return (
    <div>
      {props.renderDefault(props)}
      <div
        style={{
          marginTop: "0.35rem",
          fontSize: "0.78rem",
          color: over ? "#b3261e" : "var(--card-muted-fg-color, #6b7280)",
        }}
      >
        {length}
        {cap ? ` / ${cap}` : ""} characters
        {over ? ", over the limit" : ""}
      </div>
    </div>
  );
}
