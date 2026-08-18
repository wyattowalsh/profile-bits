import * as z from "zod";
import {
  ACTION_USER_DEFAULT,
  ActionInputsSchema,
  ConfigSchema,
  DemoOptionsSchema,
  LanguagesOptionsSchema,
  StatsOptionsSchema,
} from "../types.ts";

export type PlaygroundFieldGroup = "global" | "demo" | "stats" | "languages";

export type PlaygroundField = {
  path: string;
  label: string;
  type: string;
  default?: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  group: PlaygroundFieldGroup;
};

const GLOBAL_CONFIG_KEYS = new Set([
  "format",
  "theme",
  "output_pair",
  "animated",
]);

const TOKEN_FIELD = /token/i;

type JsonSchemaNode = {
  type?: string;
  default?: unknown;
  enum?: readonly unknown[];
  minimum?: number;
  maximum?: number;
  items?: JsonSchemaNode;
};

type ZodObjectSchema = {
  shape: Record<string, z.ZodType>;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function labelFromKey(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isTokenField(key: string): boolean {
  return TOKEN_FIELD.test(key);
}

function fieldFromZod(
  path: string,
  group: PlaygroundFieldGroup,
  schema: z.ZodType,
  fallbackDefault?: unknown,
): PlaygroundField {
  const json = z.toJSONSchema(schema) as JsonSchemaNode;
  const type = json.type ?? "string";
  const rawEnum = json.enum ?? json.items?.enum;
  const enumValues = rawEnum?.map((value) => String(value));
  const defaultValue =
    json.default !== undefined ? cloneJson(json.default) : fallbackDefault;

  return {
    path,
    label: labelFromKey(
      path.includes(".") ? path.slice(path.lastIndexOf(".") + 1) : path,
    ),
    type,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(enumValues !== undefined && enumValues.length > 0
      ? { enum: enumValues }
      : {}),
    ...(typeof json.minimum === "number" ? { min: json.minimum } : {}),
    ...(typeof json.maximum === "number" ? { max: json.maximum } : {}),
    group,
  };
}

function fieldsFromObject(
  schema: ZodObjectSchema,
  group: Exclude<PlaygroundFieldGroup, "global">,
): PlaygroundField[] {
  const fields: PlaygroundField[] = [];
  for (const key of Object.keys(schema.shape)) {
    if (isTokenField(key)) {
      continue;
    }
    const fieldSchema = schema.shape[key];
    if (fieldSchema === undefined) {
      continue;
    }
    fields.push(fieldFromZod(`${group}.${key}`, group, fieldSchema));
  }
  return fields;
}

/**
 * Playground form fields derived from the yaml Zod shapes at runtime.
 * v0 playground chrome is github only (`demo`, `stats`, `languages`).
 * WakaTime coding tuners are fixtures/skip-live, not token fields here.
 */
export function getPlaygroundFields(): PlaygroundField[] {
  const fields: PlaygroundField[] = [];
  const configShape = ConfigSchema.shape;

  for (const key of Object.keys(configShape)) {
    if (!GLOBAL_CONFIG_KEYS.has(key) || isTokenField(key)) {
      continue;
    }
    const fieldSchema = configShape[key as keyof typeof configShape];
    fields.push(fieldFromZod(key, "global", fieldSchema));
  }

  const userSchema = ActionInputsSchema.shape.user;
  if (!isTokenField("user")) {
    fields.push(
      fieldFromZod("user", "global", userSchema, ACTION_USER_DEFAULT),
    );
  }

  fields.push(...fieldsFromObject(DemoOptionsSchema, "demo"));
  fields.push(...fieldsFromObject(StatsOptionsSchema, "stats"));
  fields.push(...fieldsFromObject(LanguagesOptionsSchema, "languages"));

  return fields;
}
