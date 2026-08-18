"use client";

import {
  getPlaygroundFields,
  type PlaygroundField,
  type PlaygroundFieldGroup,
} from "@profile-bits/core";
import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type {
  PreviewOptions,
  PreviewOutputFormat,
  PreviewTheme,
} from "./types";

const TOKEN_PATH = /token/i;

const GROUP_ORDER: readonly PlaygroundFieldGroup[] = [
  "global",
  "demo",
  "stats",
  "languages",
];

export const SCHEMA_FORM_LABEL = "Playground options";

const SCHEMA_FORM_CSS = `
[data-slot="schema-form"] [data-slot="field-group"] {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
}
[data-slot="schema-form"] [data-slot="schema-form-group-title"] {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-fd-muted-foreground);
}
[data-slot="schema-form"] input[type="text"],
[data-slot="schema-form"] input[type="number"],
[data-slot="schema-form"] select {
  width: 100%;
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
[data-slot="schema-form"] input[type="checkbox"] {
  inline-size: 1rem;
  block-size: 1rem;
  accent-color: var(--color-fd-primary);
}
[data-slot="schema-form"] [data-slot="toggle-group"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  border: 0;
  padding: 0;
}
[data-slot="schema-form"] [data-slot="toggle-group-item"] {
  border: 1px solid var(--color-fd-border);
  border-radius: 0.375rem;
  background: var(--color-fd-background);
  color: var(--color-fd-foreground);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  cursor: pointer;
}
[data-slot="schema-form"] [data-slot="toggle-group-item"][aria-pressed="true"] {
  background: var(--color-fd-primary);
  color: var(--color-fd-primary-foreground);
  border-color: var(--color-fd-primary);
}
[data-slot="schema-form"] input:focus-visible,
[data-slot="schema-form"] select:focus-visible,
[data-slot="schema-form"] [data-slot="toggle-group-item"]:focus-visible {
  outline: 2px solid var(--color-fd-ring, currentColor);
  outline-offset: 2px;
}
`;

/** Nested playground state compatible with PreviewRequest globals. */
export type SchemaFormValue = {
  user?: string;
  format?: PreviewOutputFormat;
  theme?: PreviewTheme;
  output_pair?: boolean;
  animated?: boolean;
  options?: PreviewOptions;
};

export type SchemaFormProps = Omit<
  ComponentProps<"form">,
  "onChange" | "children" | "value"
> & {
  value?: SchemaFormValue;
  onChange?: (value: SchemaFormValue) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTokenField(field: PlaygroundField): boolean {
  return TOKEN_PATH.test(field.path) || TOKEN_PATH.test(field.label);
}

function isGlobalPath(path: string): boolean {
  return !path.includes(".");
}

/** Playground tuners from `getPlaygroundFields()`, with token paths dropped. */
export function schemaFormFields(): PlaygroundField[] {
  return getPlaygroundFields().filter((field) => !isTokenField(field));
}

export function schemaFormGroups(
  fields: readonly PlaygroundField[] = schemaFormFields(),
): PlaygroundFieldGroup[] {
  const present = new Set(fields.map((field) => field.group));
  return GROUP_ORDER.filter((group) => present.has(group));
}

function getNestedValue(values: unknown, path: string): unknown {
  let current: unknown = values;
  for (const key of path.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/** Generic dotted-path write used to nest widget options. */
export function setPathValue(
  values: Record<string, unknown>,
  path: string,
  next: unknown,
): Record<string, unknown> {
  const keys = path.split(".");
  const root: Record<string, unknown> = { ...values };
  let cursor: Record<string, unknown> = root;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (key === undefined) {
      return root;
    }
    const existing = cursor[key];
    const clone = isRecord(existing) ? { ...existing } : {};
    cursor[key] = clone;
    cursor = clone;
  }
  const last = keys[keys.length - 1];
  if (last !== undefined) {
    cursor[last] = next;
  }
  return root;
}

export function getFieldValue(
  value: SchemaFormValue | undefined,
  path: string,
): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (isGlobalPath(path)) {
    return (value as Record<string, unknown>)[path];
  }
  const fromOptions = getNestedValue(value.options, path);
  if (fromOptions !== undefined) {
    return fromOptions;
  }
  return getNestedValue(value, path);
}

/** Write a playground path into the PreviewRequest-shaped value object. */
export function applySchemaField(
  value: SchemaFormValue,
  path: string,
  next: unknown,
): SchemaFormValue {
  if (isGlobalPath(path)) {
    return { ...value, [path]: next };
  }
  const options = isRecord(value.options) ? value.options : {};
  return {
    ...value,
    options: setPathValue(options, path, next) as PreviewOptions,
  };
}

function labelFromGroup(group: PlaygroundFieldGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

function fieldControlId(path: string): string {
  return `playground-${path.replaceAll(".", "-")}`;
}

function resolvedValue(
  field: PlaygroundField,
  value: SchemaFormValue | undefined,
): unknown {
  const fromValue = getFieldValue(value, field.path);
  return fromValue !== undefined ? fromValue : field.default;
}

function parseNumberInput(event: ChangeEvent<HTMLInputElement>): unknown {
  const next = event.target.valueAsNumber;
  return Number.isNaN(next) ? undefined : next;
}

function parseListInput(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function FieldControl({
  field,
  id,
  value,
  onValueChange,
}: {
  field: PlaygroundField;
  id: string;
  value: unknown;
  onValueChange: (value: unknown) => void;
}) {
  const enumValues = field.enum;

  if (field.type === "boolean") {
    return (
      <input
        id={id}
        name={field.path}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onValueChange(event.target.checked)}
      />
    );
  }

  if (field.type === "integer" || field.type === "number") {
    return (
      <input
        id={id}
        name={field.path}
        type="number"
        min={field.min}
        max={field.max}
        step={field.type === "integer" ? 1 : "any"}
        value={typeof value === "number" ? value : ""}
        onChange={(event) => onValueChange(parseNumberInput(event))}
      />
    );
  }

  if (enumValues !== undefined && enumValues.length > 0) {
    const isMultiple = field.type === "array";
    const selected = isMultiple
      ? Array.isArray(value)
        ? value.map(String)
        : []
      : typeof value === "string" && enumValues.includes(value)
        ? value
        : (enumValues[0] ?? "");

    if (isMultiple) {
      return (
        <>
          <input type="hidden" name={field.path} value={selected.join(",")} />
          <ToggleGroup
            type="multiple"
            value={selected}
            aria-labelledby={`${id}-label`}
            onValueChange={(next) => {
              onValueChange(
                Array.isArray(next) ? next : next === "" ? [] : [next],
              );
            }}
          >
            {enumValues.map((option) => (
              <ToggleGroupItem key={option} value={option} data-value={option}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      );
    }

    return (
      <select
        id={id}
        name={field.path}
        value={selected}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {enumValues.map((option) => (
          <option key={option} value={option} data-value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "array") {
    const text = Array.isArray(value) ? value.map(String).join(", ") : "";
    return (
      <input
        id={id}
        name={field.path}
        type="text"
        value={text}
        onChange={(event) => onValueChange(parseListInput(event.target.value))}
      />
    );
  }

  return (
    <input
      id={id}
      name={field.path}
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}

/**
 * Playground tuners rendered from `getPlaygroundFields()` only.
 * Groups follow field.group. No token inputs.
 */
export function SchemaForm({
  value,
  onChange,
  className,
  onSubmit,
  ...props
}: SchemaFormProps) {
  const fields = useMemo(() => schemaFormFields(), []);
  const groups = useMemo(() => schemaFormGroups(fields), [fields]);
  const isControlled = value !== undefined;
  const [draft, setDraft] = useState<SchemaFormValue>({});
  const current = isControlled ? value : draft;

  const setField = useCallback(
    (path: string, next: unknown) => {
      const updated = applySchemaField(current, path, next);
      onChange?.(updated);
      if (!isControlled) {
        setDraft(updated);
      }
    },
    [current, isControlled, onChange],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit?.(event);
    },
    [onSubmit],
  );

  return (
    <>
      <style href="profile-bits-schema-form" precedence="default">
        {SCHEMA_FORM_CSS}
      </style>
      <div data-slot="schema-form" data-schema-form="">
        <Form
          {...props}
          className={cn(className)}
          aria-label={SCHEMA_FORM_LABEL}
          onSubmit={handleSubmit}
        >
          {groups.map((group) => {
            const headingId = `playground-group-${group}`;
            return (
              <FieldGroup
                key={group}
                data-group={group}
                aria-labelledby={headingId}
              >
                <h2 id={headingId} data-slot="schema-form-group-title">
                  {labelFromGroup(group)}
                </h2>
                {fields
                  .filter((field) => field.group === group)
                  .map((field) => {
                    const id = fieldControlId(field.path);
                    const hasEnum =
                      field.enum !== undefined &&
                      field.enum.length > 0 &&
                      field.type === "array";
                    return (
                      <Field
                        key={field.path}
                        data-path={field.path}
                        data-group={field.group}
                      >
                        <FieldLabel
                          id={hasEnum ? `${id}-label` : undefined}
                          htmlFor={hasEnum ? undefined : id}
                        >
                          {field.label}
                        </FieldLabel>
                        <FieldControl
                          field={field}
                          id={id}
                          value={resolvedValue(field, current)}
                          onValueChange={(next) => setField(field.path, next)}
                        />
                      </Field>
                    );
                  })}
              </FieldGroup>
            );
          })}
        </Form>
      </div>
    </>
  );
}
