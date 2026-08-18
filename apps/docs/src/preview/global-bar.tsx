"use client";

import { type ComponentProps, useId } from "react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ThemeMixer } from "./theme-mixer";
import { ThemePicker } from "./theme-picker";
import {
  isPreviewOutputFormat,
  PREVIEW_OUTPUT_FORMATS,
  type PreviewOutputFormat,
  type PreviewTheme,
} from "./types";

export const GLOBAL_BAR_LABEL = "Preview controls";
export const FORMAT_FIELD_LABEL = "Format";
export const THEME_FIELD_LABEL = "Theme";
export const OUTPUT_PAIR_FIELD_LABEL = "Output pair";
export const USER_FIELD_LABEL = "User";

export const GLOBAL_BAR_FORMAT_LABELS = {
  svg: "svg",
  png: "png",
  jpeg: "jpeg",
  webp: "animated webp",
  ico: "ico",
  gif: "gif",
  apng: "apng",
} as const satisfies Record<PreviewOutputFormat, string>;

const GLOBAL_BAR_CSS = `
[data-slot="global-bar"] {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
}
[data-slot="global-bar"] [data-slot="field-group"] {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
  margin: 0;
}
[data-slot="global-bar"] [data-slot="field"] {
  display: grid;
  gap: 0.375rem;
  min-inline-size: 8rem;
}
[data-slot="global-bar"] [data-field="output_pair"] {
  align-items: center;
  min-block-size: 2.25rem;
}
[data-slot="global-bar"] [data-slot="toggle-group"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
[data-slot="global-bar"] input[type="text"] {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  min-inline-size: 10rem;
}
[data-slot="global-bar"] input[type="checkbox"] {
  inline-size: 1rem;
  block-size: 1rem;
  accent-color: var(--color-fd-primary);
}
[data-slot="global-bar"] input:focus-visible,
[data-slot="global-bar"] [data-slot="toggle-group-item"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
`;

export type GlobalBarValue = {
  format: PreviewOutputFormat;
  theme: PreviewTheme;
  output_pair: boolean;
  user: string;
};

export type GlobalBarProps = Omit<
  ComponentProps<"div">,
  "children" | "onChange"
> & {
  value: GlobalBarValue;
  onChange?: (value: GlobalBarValue) => void;
};

export function formatPickerLabel(format: PreviewOutputFormat): string {
  return GLOBAL_BAR_FORMAT_LABELS[format];
}

function selectedToggleValue(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

/** Shared playground/generate chrome: format, theme, output_pair, user. */
export function GlobalBar({
  value,
  onChange,
  className,
  ...props
}: GlobalBarProps) {
  const baseId = useId();
  const formatLabelId = `${baseId}-format-label`;
  const themeLabelId = `${baseId}-theme-label`;
  const pairId = `${baseId}-output-pair`;
  const userId = `${baseId}-user`;

  function patch(next: Partial<GlobalBarValue>) {
    onChange?.({ ...value, ...next });
  }

  return (
    <>
      <style href="profile-bits-global-bar" precedence="default">
        {GLOBAL_BAR_CSS}
      </style>
      <div
        {...props}
        data-slot="global-bar"
        role="toolbar"
        aria-label={GLOBAL_BAR_LABEL}
        className={cn(className)}
      >
        <FieldGroup>
          <Field data-field="format">
            <FieldLabel id={formatLabelId}>{FORMAT_FIELD_LABEL}</FieldLabel>
            <ToggleGroup
              type="single"
              value={value.format}
              aria-labelledby={formatLabelId}
              onValueChange={(next) => {
                const format = selectedToggleValue(next);
                if (isPreviewOutputFormat(format)) {
                  patch({ format });
                }
              }}
            >
              {PREVIEW_OUTPUT_FORMATS.map((format) => (
                <ToggleGroupItem
                  key={format}
                  value={format}
                  data-value={format}
                  aria-label={formatPickerLabel(format)}
                >
                  {formatPickerLabel(format)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field data-field="theme">
            <FieldLabel id={themeLabelId} htmlFor={`${baseId}-theme`}>
              {THEME_FIELD_LABEL}
            </FieldLabel>
            <ThemePicker
              id={`${baseId}-theme`}
              value={value.theme}
              onChange={(theme) => {
                patch({ theme });
              }}
            />
            {typeof value.theme !== "string" ? (
              <ThemeMixer
                value={value.theme}
                onChange={(theme) => {
                  patch({ theme });
                }}
              />
            ) : null}
          </Field>

          <Field data-field="output_pair">
            <FieldLabel htmlFor={pairId}>{OUTPUT_PAIR_FIELD_LABEL}</FieldLabel>
            <input
              id={pairId}
              name="output_pair"
              type="checkbox"
              checked={value.output_pair}
              onChange={(event) => {
                patch({ output_pair: event.target.checked });
              }}
            />
          </Field>

          <Field data-field="user">
            <FieldLabel htmlFor={userId}>{USER_FIELD_LABEL}</FieldLabel>
            <input
              id={userId}
              name="user"
              type="text"
              value={value.user}
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                patch({ user: event.target.value });
              }}
            />
          </Field>
        </FieldGroup>
      </div>
    </>
  );
}
