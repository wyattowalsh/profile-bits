/**
 * Node HTML parser (no browser runtime). Tokenizes tags, skips
 * script/style rawtext, and maps public fields into a typed dump.
 */

export type HtmlHeading = {
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
};

export type HtmlScrapeDump = {
  readonly url: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly canonical: string | null;
  readonly lang: string | null;
  readonly meta: Readonly<Record<string, string>>;
  readonly openGraph: Readonly<Record<string, string>>;
  readonly twitter: Readonly<Record<string, string>>;
  readonly jsonLd: readonly unknown[];
  readonly headings: readonly HtmlHeading[];
};

export type HtmlParseFlags = {
  readonly passwordInput: boolean;
  readonly loginForm: boolean;
  readonly challenge: boolean;
};

export type HtmlParseResult = {
  readonly dump: HtmlScrapeDump;
  readonly flags: HtmlParseFlags;
};

export type ParseHtmlInput = {
  html: string;
  url: string;
  status?: number;
  contentType?: string | null;
};

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const RAWTEXT_TAGS = new Set(["script", "style"]);
const RCDATA_TAGS = new Set(["title", "textarea"]);

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

type Frame = {
  name: string;
  attrs: Record<string, string>;
  text: string;
};

export function parseHtml(input: ParseHtmlInput): HtmlParseResult {
  const extracted = extract(input.html);
  const description =
    extracted.meta.description ?? extracted.openGraph.description ?? null;
  const dump: HtmlScrapeDump = Object.freeze({
    url: input.url,
    status: input.status ?? 200,
    contentType: input.contentType ?? null,
    title: extracted.title,
    description,
    canonical: extracted.canonical,
    lang: extracted.lang,
    meta: Object.freeze({ ...extracted.meta }),
    openGraph: Object.freeze({ ...extracted.openGraph }),
    twitter: Object.freeze({ ...extracted.twitter }),
    jsonLd: Object.freeze(extracted.jsonLd),
    headings: Object.freeze(extracted.headings.map((h) => Object.freeze(h))),
  });
  const title = extracted.title ?? "";
  const lowerHtml = input.html.toLowerCase();
  const challenge =
    extracted.challenge ||
    /just a moment/iu.test(title) ||
    lowerHtml.includes("/cdn-cgi/challenge-platform") ||
    lowerHtml.includes("cf-browser-verification") ||
    /enable javascript (and cookies )?to continue/iu.test(input.html);
  return {
    dump,
    flags: Object.freeze({
      passwordInput: extracted.passwordInput,
      loginForm: extracted.loginForm,
      challenge,
    }),
  };
}

function extract(html: string): {
  title: string | null;
  lang: string | null;
  canonical: string | null;
  meta: Record<string, string>;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: unknown[];
  headings: HtmlHeading[];
  passwordInput: boolean;
  loginForm: boolean;
  challenge: boolean;
} {
  const meta: Record<string, string> = {};
  const openGraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  const jsonLd: unknown[] = [];
  const headings: HtmlHeading[] = [];
  let title: string | null = null;
  let lang: string | null = null;
  let canonical: string | null = null;
  let passwordInput = false;
  let loginForm = false;
  let challenge = false;

  const stack: Frame[] = [{ name: "#document", attrs: {}, text: "" }];
  const tokens = tokenize(html);
  for (const token of tokens) {
    if (token.kind === "text") {
      const current = stack[stack.length - 1];
      if (current != null) {
        current.text += token.value;
      }
      continue;
    }
    if (token.kind === "end") {
      closeTo(stack, token.name, (frame) => {
        applyClose(frame, {
          setTitle: (value) => {
            title = value;
          },
          addHeading: (heading) => {
            headings.push(heading);
          },
          addJsonLd: (value) => {
            if (Array.isArray(value)) {
              jsonLd.push(...value);
            } else {
              jsonLd.push(value);
            }
          },
        });
      });
      continue;
    }
    const attrs = token.attrs;
    if (token.name === "html" && attrs.lang != null && attrs.lang !== "") {
      lang = attrs.lang;
    }
    if (token.name === "meta") {
      applyMeta(attrs, meta, openGraph, twitter);
    }
    if (token.name === "link" && relIncludes(attrs.rel, "canonical")) {
      const href = attrs.href?.trim() ?? "";
      if (href !== "") {
        canonical = href;
      }
    }
    if (
      token.name === "input" &&
      (attrs.type ?? "").toLowerCase() === "password"
    ) {
      passwordInput = true;
    }
    if (token.name === "form" && isLoginAction(attrs.action)) {
      loginForm = true;
    }
    if (
      token.name === "script" &&
      (attrs.src ?? "").toLowerCase().includes("/cdn-cgi/challenge-platform")
    ) {
      challenge = true;
    }
    if (!VOID_TAGS.has(token.name) && !token.selfClosing) {
      stack.push({ name: token.name, attrs, text: "" });
    }
  }
  while (stack.length > 1) {
    const frame = stack.pop();
    if (frame == null) {
      break;
    }
    applyClose(frame, {
      setTitle: (value) => {
        title = value;
      },
      addHeading: (heading) => {
        headings.push(heading);
      },
      addJsonLd: (value) => {
        if (Array.isArray(value)) {
          jsonLd.push(...value);
        } else {
          jsonLd.push(value);
        }
      },
    });
  }
  if (!loginForm && title != null && isLoginTitle(title)) {
    loginForm = true;
  }
  return {
    title,
    lang,
    canonical,
    meta,
    openGraph,
    twitter,
    jsonLd,
    headings,
    passwordInput,
    loginForm,
    challenge,
  };
}

function applyClose(
  frame: Frame,
  sink: {
    setTitle: (value: string | null) => void;
    addHeading: (heading: HtmlHeading) => void;
    addJsonLd: (value: unknown) => void;
  },
): void {
  const text = collapseWhitespace(frame.text);
  if (frame.name === "title") {
    sink.setTitle(text === "" ? null : text);
    return;
  }
  const headingLevel = headingLevelOf(frame.name);
  if (headingLevel != null && text !== "") {
    sink.addHeading({ level: headingLevel, text });
    return;
  }
  if (
    frame.name === "script" &&
    isJsonLdType(frame.attrs.type) &&
    frame.text.trim() !== ""
  ) {
    try {
      sink.addJsonLd(JSON.parse(frame.text) as unknown);
    } catch {
      // Invalid JSON-LD is omitted from the dump, not a parse failure.
    }
  }
}

function applyMeta(
  attrs: Record<string, string>,
  meta: Record<string, string>,
  openGraph: Record<string, string>,
  twitter: Record<string, string>,
): void {
  const content = attrs.content ?? "";
  const property = (attrs.property ?? "").toLowerCase();
  const name = (attrs.name ?? "").toLowerCase();
  if (property.startsWith("og:") && content !== "") {
    const key = property.slice(3);
    if (key !== "" && openGraph[key] == null) {
      openGraph[key] = content;
    }
    return;
  }
  if (
    (property.startsWith("twitter:") || name.startsWith("twitter:")) &&
    content !== ""
  ) {
    const key = (property.startsWith("twitter:") ? property : name).slice(
      "twitter:".length,
    );
    if (key !== "" && twitter[key] == null) {
      twitter[key] = content;
    }
    return;
  }
  if (name !== "" && content !== "" && meta[name] == null) {
    meta[name] = content;
  }
}

function headingLevelOf(name: string): HtmlHeading["level"] | null {
  if (name.length !== 2 || name[0] !== "h") {
    return null;
  }
  const level = Number(name[1]);
  if (level >= 1 && level <= 6) {
    return level as HtmlHeading["level"];
  }
  return null;
}

function isJsonLdType(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "application/ld+json";
}

function relIncludes(rel: string | undefined, target: string): boolean {
  if (rel == null) {
    return false;
  }
  return rel.toLowerCase().split(/\s+/u).includes(target);
}

function isLoginAction(action: string | undefined): boolean {
  if (action == null || action.trim() === "") {
    return false;
  }
  const path = action.trim().toLowerCase();
  return /login|sign[-_]?in|session|oauth|auth/u.test(path);
}

function isLoginTitle(title: string): boolean {
  return /sign\s*in|log\s*in|login|authenticate/iu.test(title);
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

type StartToken = {
  kind: "start";
  name: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
};
type EndToken = { kind: "end"; name: string };
type TextToken = { kind: "text"; value: string };
type Token = StartToken | EndToken | TextToken;

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<![CDATA[", i)) {
      const end = html.indexOf("]]>", i + 9);
      if (end === -1) {
        tokens.push({ kind: "text", value: html.slice(i) });
        break;
      }
      tokens.push({ kind: "text", value: html.slice(i + 9, end) });
      i = end + 3;
      continue;
    }
    if (html.startsWith("<!", i) || html.startsWith("<?", i)) {
      const end = html.indexOf(">", i + 2);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if (html.startsWith("</", i)) {
      const parsed = readEndTag(html, i);
      tokens.push({ kind: "end", name: parsed.name });
      i = parsed.next;
      continue;
    }
    if (html[i] === "<" && isNameStart(html[i + 1])) {
      const parsed = readStartTag(html, i);
      tokens.push({
        kind: "start",
        name: parsed.name,
        attrs: parsed.attrs,
        selfClosing: parsed.selfClosing,
      });
      i = parsed.next;
      if (RAWTEXT_TAGS.has(parsed.name) || RCDATA_TAGS.has(parsed.name)) {
        const raw = readRawtext(
          html,
          lower,
          i,
          parsed.name,
          RCDATA_TAGS.has(parsed.name),
        );
        if (raw.text !== "") {
          tokens.push({ kind: "text", value: raw.text });
        }
        tokens.push({ kind: "end", name: parsed.name });
        i = raw.next;
      }
      continue;
    }
    const next = html.indexOf("<", i + 1);
    const slice = next === -1 ? html.slice(i) : html.slice(i, next);
    tokens.push({ kind: "text", value: decodeEntities(slice) });
    i = next === -1 ? html.length : next;
  }
  return tokens;
}

function readStartTag(
  html: string,
  start: number,
): {
  name: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
  next: number;
} {
  let i = start + 1;
  const nameStart = i;
  while (i < html.length && isNameChar(html[i])) {
    i += 1;
  }
  const name = html.slice(nameStart, i).toLowerCase();
  const attrs: Record<string, string> = {};
  let selfClosing = false;
  while (i < html.length) {
    while (i < html.length && isWhitespace(html[i])) {
      i += 1;
    }
    if (i >= html.length) {
      break;
    }
    if (html[i] === ">") {
      i += 1;
      break;
    }
    if (html.startsWith("/>", i)) {
      selfClosing = true;
      i += 2;
      break;
    }
    const attr = readAttribute(html, i);
    if (attr.name !== "" && attrs[attr.name] == null) {
      attrs[attr.name] = attr.value;
    }
    i = attr.next;
    if (i === attr.start) {
      i += 1;
    }
  }
  return { name, attrs, selfClosing, next: i };
}

function readEndTag(
  html: string,
  start: number,
): { name: string; next: number } {
  let i = start + 2;
  const nameStart = i;
  while (i < html.length && isNameChar(html[i])) {
    i += 1;
  }
  const name = html.slice(nameStart, i).toLowerCase();
  const gt = html.indexOf(">", i);
  return { name, next: gt === -1 ? html.length : gt + 1 };
}

function readAttribute(
  html: string,
  start: number,
): { name: string; value: string; next: number; start: number } {
  let i = start;
  const nameStart = i;
  while (i < html.length && isNameChar(html[i])) {
    i += 1;
  }
  const name = html.slice(nameStart, i).toLowerCase();
  while (i < html.length && isWhitespace(html[i])) {
    i += 1;
  }
  if (html[i] !== "=") {
    return { name, value: "", next: i, start };
  }
  i += 1;
  while (i < html.length && isWhitespace(html[i])) {
    i += 1;
  }
  const quote = html[i];
  if (quote === '"' || quote === "'") {
    i += 1;
    const valueStart = i;
    const end = html.indexOf(quote, i);
    if (end === -1) {
      return {
        name,
        value: decodeEntities(html.slice(valueStart)),
        next: html.length,
        start,
      };
    }
    return {
      name,
      value: decodeEntities(html.slice(valueStart, end)),
      next: end + 1,
      start,
    };
  }
  const valueStart = i;
  while (i < html.length && !isWhitespace(html[i]) && html[i] !== ">") {
    i += 1;
  }
  return {
    name,
    value: decodeEntities(html.slice(valueStart, i)),
    next: i,
    start,
  };
}

function readRawtext(
  html: string,
  lower: string,
  start: number,
  tag: string,
  decode: boolean,
): { text: string; next: number } {
  const needle = `</${tag}`;
  let i = start;
  while (i < html.length) {
    const found = lower.indexOf(needle, i);
    if (found === -1) {
      const rest = html.slice(start);
      return { text: decode ? decodeEntities(rest) : rest, next: html.length };
    }
    const after = found + needle.length;
    const nextChar = html[after];
    if (
      nextChar == null ||
      nextChar === ">" ||
      isWhitespace(nextChar) ||
      nextChar === "/"
    ) {
      const raw = html.slice(start, found);
      const gt = html.indexOf(">", after);
      return {
        text: decode ? decodeEntities(raw) : raw,
        next: gt === -1 ? html.length : gt + 1,
      };
    }
    i = after;
  }
  return { text: "", next: html.length };
}

function closeTo(
  stack: Frame[],
  name: string,
  onClose: (frame: Frame) => void,
): void {
  let index = -1;
  for (let i = stack.length - 1; i >= 1; i -= 1) {
    if (stack[i]?.name === name) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    return;
  }
  while (stack.length > index) {
    const frame = stack.pop();
    if (frame != null && frame.name !== "#document") {
      onClose(frame);
    }
  }
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);?/giu,
    (match, body: string) => {
      const named = NAMED_ENTITIES[body.toLowerCase()];
      if (named != null) {
        return named;
      }
      if (body[0] === "#") {
        const hex = body[1] === "x" || body[1] === "X";
        const num = Number.parseInt(
          hex ? body.slice(2) : body.slice(1),
          hex ? 16 : 10,
        );
        if (Number.isFinite(num) && num > 0) {
          return String.fromCodePoint(num);
        }
      }
      return match;
    },
  );
}

function isNameStart(char: string | undefined): boolean {
  return char != null && /[A-Za-z]/u.test(char);
}

function isNameChar(char: string | undefined): boolean {
  return char != null && /[A-Za-z0-9:-]/u.test(char);
}

function isWhitespace(char: string | undefined): boolean {
  return char != null && /\s/u.test(char);
}
