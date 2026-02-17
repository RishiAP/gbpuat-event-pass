import sanitizeHtml from "sanitize-html";
import mjml2html from "mjml";

// ─── Variable Detection ────────────────────────────────────────────────
const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;
const CONDITIONAL_REGEX = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/(if)\}\}/g;

/** Keywords used for control flow — not actual template variables */
const CONTROL_KEYWORDS = new Set(["if", "else", "endif"]);

/**
 * Extract all {{variable_name}} and {{#if variable_name}} occurrences from a string.
 * Filters out control-flow keywords like {{else}}, {{/if}}.
 */
export function extractVariables(source: string): string[] {
  const vars = new Set<string>();
  // Standard variables (skip control keywords)
  const varMatches = source.matchAll(VARIABLE_REGEX);
  for (const m of varMatches) {
    if (!CONTROL_KEYWORDS.has(m[1])) {
      vars.add(m[1]);
    }
  }
  // Variables used in conditionals
  const condMatches = source.matchAll(/\{\{#if\s+(\w+)\}\}/g);
  for (const m of condMatches) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

// ─── MJML Helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the string appears to be MJML (contains <mjml or <mj- tags).
 */
export function isMJML(source: string): boolean {
  return /<mjml[\s>]/i.test(source) || /<mj-/i.test(source);
}

/**
 * Returns true if the string looks like raw HTML (but not MJML).
 */
export function isHTML(source: string): boolean {
  return /<[a-z][\s\S]*>/i.test(source) && !isMJML(source);
}

export interface MJMLCompileResult {
  success: boolean;
  html?: string;
  errors?: string[];
}

/**
 * Compile MJML source to HTML. Returns compiled HTML or error messages.
 */
export function compileMJML(mjmlSource: string): MJMLCompileResult {
  try {
    const result = mjml2html(mjmlSource, {
      validationLevel: "strict",
      keepComments: false,
    });

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        errors: result.errors.map(
          (e) => `Line ${e.line}: ${e.message} (${e.tagName})`
        ),
      };
    }

    return { success: true, html: result.html };
  } catch (err: any) {
    return {
      success: false,
      errors: [err.message || "Unknown MJML compilation error"],
    };
  }
}

// ─── HTML Sanitization ─────────────────────────────────────────────────

/**
 * Sanitize HTML, removing dangerous tags/attributes while preserving
 * template variables and styling.
 */
export function sanitizeHTML(html: string): string {
  // Temporarily protect all template syntax from being stripped:
  // {{var}}, {{#if var}}, {{else}}, {{/if}}
  const placeholder = "___TPL_VAR_";
  const tokens: string[] = [];
  const ALL_TEMPLATE_SYNTAX = /\{\{(?:#if\s+\w+|else|\/if|\w+)\}\}/g;
  const protected_ = html.replace(ALL_TEMPLATE_SYNTAX, (match) => {
    tokens.push(match);
    return `${placeholder}${tokens.length - 1}___`;
  });

  const clean = sanitizeHtml(protected_, {
    allowedTags: [
      // Structure
      "html", "head", "body", "div", "span", "p", "br", "hr",
      // Headings
      "h1", "h2", "h3", "h4", "h5", "h6",
      // Lists
      "ul", "ol", "li",
      // Table
      "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
      // Inline
      "a", "img", "strong", "em", "b", "i", "u", "s", "sub", "sup", "small",
      // Media
      "figure", "figcaption",
      // Misc
      "blockquote", "pre", "code", "center", "section", "article", "header", "footer", "nav", "main",
      // Document / Style / External resources
      "style", "meta", "title", "link",
    ],
    allowedAttributes: {
      "*": [
        "style", "class", "id", "title", "role",
        "align", "valign", "bgcolor", "border",
        "dir", "lang", "xmlns", "xmlns:v", "xmlns:o",
        "data-*",
      ],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan", "width", "height", "cellpadding", "cellspacing"],
      th: ["colspan", "rowspan", "width", "height"],
      table: ["cellpadding", "cellspacing", "width", "height", "border"],
      meta: ["http-equiv", "content", "name", "charset"],
      link: ["href", "rel", "type", "media", "integrity", "crossorigin", "referrerpolicy", "as", "sizes"],
    },
    allowVulnerableTags: true,
    allowedSchemes: ["http", "https", "mailto"],
  });

  // Restore template tokens
  const restored = clean.replace(
    new RegExp(`${placeholder}(\\d+)___`, "g"),
    (_, idx) => tokens[parseInt(idx)]
  );

  return restored;
}

// ─── Validation ────────────────────────────────────────────────────────

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  html?: string;
  variables: string[];
}

/**
 * Validate an email template: must be MJML, compiles to HTML, sanitized.
 */
export function validateEmailTemplate(source: string): TemplateValidationResult {
  const errors: string[] = [];

  if (!source || source.trim().length === 0) {
    return { valid: false, errors: ["Template source is empty"], variables: [] };
  }

  // Must be MJML
  if (!isMJML(source)) {
    return {
      valid: false,
      errors: ["Email templates must use MJML format. Raw HTML is not accepted."],
      variables: [],
    };
  }

  // Compile MJML → HTML
  const compileResult = compileMJML(source);
  if (!compileResult.success || !compileResult.html) {
    return {
      valid: false,
      errors: compileResult.errors || ["MJML compilation failed"],
      variables: extractVariables(source),
    };
  }

  // Sanitize the compiled HTML
  const sanitized = sanitizeHTML(compileResult.html);

  // Extract variables from the sanitized output
  const variables = extractVariables(sanitized);

  if (sanitized.trim().length === 0) {
    errors.push("Compiled HTML is empty after sanitization");
  }

  return {
    valid: errors.length === 0,
    errors,
    html: sanitized,
    variables,
  };
}

/**
 * Validate a PDF template: must be plain HTML (no MJML), sanitized.
 */
export function validatePDFTemplate(source: string): TemplateValidationResult {
  const errors: string[] = [];

  if (!source || source.trim().length === 0) {
    return { valid: false, errors: ["Template source is empty"], variables: [] };
  }

  // Must NOT be MJML
  if (isMJML(source)) {
    return {
      valid: false,
      errors: ["PDF templates must use plain HTML. MJML is not accepted."],
      variables: [],
    };
  }

  // Must be valid HTML
  if (!isHTML(source)) {
    return {
      valid: false,
      errors: ["Input does not appear to be valid HTML"],
      variables: [],
    };
  }

  // Sanitize
  const sanitized = sanitizeHTML(source);
  const variables = extractVariables(sanitized);

  if (sanitized.trim().length === 0) {
    errors.push("HTML is empty after sanitization");
  }

  return {
    valid: errors.length === 0,
    errors,
    html: sanitized,
    variables,
  };
}

// ─── Runtime Variable Replacement ──────────────────────────────────────

export interface ReplaceResult {
  success: boolean;
  html?: string;
  missingVariables?: string[];
}

/**
 * Replace {{variable}} placeholders and process {{#if var}}...{{else}}...{{/if}}
 * conditional blocks in HTML with provided data.
 * Checks that all required variables are present.
 *
 * Conditional logic:
 *   {{#if var}}...{{/if}}          — renders block if var is truthy (non-empty, not "N/A")
 *   {{#if var}}...{{else}}...{{/if}} — renders if-block or else-block
 */
export function replaceTemplateVariables(
  html: string,
  data: Record<string, string>,
  requiredVariables: string[]
): ReplaceResult {
  // Fail if any required variables are missing
  const missing = requiredVariables.filter((v) => !(v in data) || data[v] === undefined || data[v] === null);
  if (missing.length > 0) {
    return {
      success: false,
      missingVariables: missing,
    };
  }

  // 1. Process conditional blocks first
  let result = html.replace(
    CONDITIONAL_REGEX,
    (_match, varName: string, ifBlock: string, elseBlock: string | undefined) => {
      const value = data[varName];
      const isTruthy = value !== undefined && value !== null && value !== "" && value !== "N/A";
      return isTruthy ? ifBlock : (elseBlock ?? "");
    }
  );

  // 2. Replace simple variables
  result = result.replace(VARIABLE_REGEX, (match, varName) => {
    return varName in data ? String(data[varName]) : match;
  });

  return { success: true, html: result };
}
