import { connect } from "@/config/database/mongoDBConfig";
import { Template, ITemplate } from "@/models/Template";
import { replaceTemplateVariables, ReplaceResult } from "@/lib/templateUtils";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

connect();

export interface RenderedTemplate {
  html: string;
  templateId: string;
  templateName: string;
}

/**
 * Fetch and render an email template for a given event.
 * Replaces all {{variable}} placeholders with the provided data.
 * Throws if template not found, or required variables are missing.
 */
export async function renderEmailTemplate(
  eventId: string,
  templateName: string,
  data: Record<string, string>
): Promise<RenderedTemplate> {
  const template = await Template.findOne({
    event: eventId,
    type: "email_html",
    name: templateName,
  });

  if (!template) {
    throw new Error(
      `Email template "${templateName}" not found for event ${eventId}`
    );
  }

  const result = replaceTemplateVariables(
    template.html,
    data,
    template.requiredVariables
  );

  if (!result.success) {
    throw new Error(
      `Missing required variables for email template "${templateName}": ${result.missingVariables?.join(", ")}`
    );
  }

  return {
    html: result.html!,
    templateId: template._id.toString(),
    templateName: template.name,
  };
}

/**
 * Fetch and render a PDF invitation template for a given event.
 * Replaces all {{variable}} placeholders with the provided data.
 * Throws if template not found, or required variables are missing.
 */
export async function renderPDFTemplate(
  eventId: string,
  templateName: string,
  data: Record<string, string>
): Promise<RenderedTemplate> {
  const template = await Template.findOne({
    event: eventId,
    type: "pdf_html",
    name: templateName,
  });

  if (!template) {
    throw new Error(
      `PDF template "${templateName}" not found for event ${eventId}`
    );
  }

  const result = replaceTemplateVariables(
    template.html,
    data,
    template.requiredVariables
  );

  if (!result.success) {
    throw new Error(
      `Missing required variables for PDF template "${templateName}": ${result.missingVariables?.join(", ")}`
    );
  }

  return {
    html: result.html!,
    templateId: template._id.toString(),
    templateName: template.name,
  };
}

/**
 * Get all templates for an event by type.
 */
export async function getTemplatesForEvent(
  eventId: string,
  type?: "email_html" | "pdf_html"
): Promise<ITemplate[]> {
  const filter: Record<string, string> = { event: eventId };
  if (type) filter.type = type;
  return Template.find(filter).sort({ updatedAt: -1 });
}

/**
 * Check if required templates exist for an event before
 * allowing email send or PDF generation.
 */
export async function validateTemplatesExist(
  eventId: string,
  templateNames: { email?: string; pdf?: string }
): Promise<{ valid: boolean; missing: string[] }> {
  const missing: string[] = [];

  if (templateNames.email) {
    const emailTemplate = await Template.findOne({
      event: eventId,
      type: "email_html",
      name: templateNames.email,
    });
    if (!emailTemplate) {
      missing.push(`Email template: ${templateNames.email}`);
    }
  }

  if (templateNames.pdf) {
    const pdfTemplate = await Template.findOne({
      event: eventId,
      type: "pdf_html",
      name: templateNames.pdf,
    });
    if (!pdfTemplate) {
      missing.push(`PDF template: ${templateNames.pdf}`);
    }
  }

  return { valid: missing.length === 0, missing };
}

// ─── Constants ─────────────────────────────────────────────────────────

const DEFAULT_PHOTO =
  "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png";

// ─── Variable Builders ─────────────────────────────────────────────────

/**
 * Build flat variable map for invitation PDF templates.
 * Available variables: {{qr_token}}, {{qr_url}}, {{photo}}, {{user_name}},
 * {{email}}, {{aadhar}}, {{verifier}}, {{entry_gate}}, {{enclosure_no}},
 * {{college_id}}, {{hostel_name}}, {{designation}}, {{department_name}},
 * {{college_name}}, {{is_student}}
 *
 * is_student = has college_id → show ID No. + Hostel, hide Designation
 * otherwise  → show Designation, hide ID No. + Hostel
 * College & Department are always shown.
 *
 * Any null / missing value is replaced with "N/A".
 */
function buildInvitationVariables(
  eventId: string,
  user: any,
  verifier: string,
  enclosure_no: string,
  entry_gate: string | null
): Record<string, string> {
  const qrToken = jwt.sign(
    { event: eventId, email: user.email },
    String(process.env.JWT_USER_QR_SECRET)
  );

  const isStudent = Boolean(user.college_id);

  return {
    qr_token: qrToken,
    qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=196x196&data=${qrToken}`,
    photo: user.photo ?? DEFAULT_PHOTO,
    user_name: user.name || "N/A",
    email: user.email || "N/A",
    aadhar: user.aadhar || "N/A",
    verifier: verifier || "N/A",
    entry_gate: entry_gate || "N/A",
    enclosure_no: enclosure_no || "N/A",
    college_id: user.college_id?.toString() || "N/A",
    hostel_name: user.hostel?.name || "N/A",
    designation: user.designation || "N/A",
    department_name: user.department?.name || "N/A",
    college_name: user.college?.name || "N/A",
    // Dynamic logo from env
    gbpuat_logo: process.env.GBPUAT_LOGO_IMAGE ?? DEFAULT_PHOTO,
    // Boolean flag: {{#if is_student}} → show ID + Hostel, {{else}} → show Designation
    is_student: isStudent ? "true" : "",
  };
}

/**
 * Build flat variable map for faculty ID card templates.
 * Available variables: {{qr_token}}, {{qr_url}}, {{event_title}},
 * {{user_name}}, {{email}}, {{designation}}, {{college_name}},
 * {{department_name}}, {{verifier_name}}, {{enclosure_no}},
 * {{photo}}, {{venue}}
 */
function buildFacultyIdVariables(
  event: any,
  user: any
): Record<string, string> {
  const eventId = event._id?.toString?.() ?? event._id;
  const qrToken = jwt.sign(
    { event: eventId, email: user.email },
    String(process.env.JWT_USER_QR_SECRET)
  );
  const userEvent = (user.events as any)?.get?.(eventId);

  return {
    qr_token: qrToken,
    qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=164x164&data=${qrToken}`,
    event_title: event.title || "N/A",
    user_name: user.name || "N/A",
    email: user.email || "N/A",
    designation: user.designation || "N/A",
    college_name: user.college?.name || "N/A",
    department_name: user.department?.name || "N/A",
    verifier_name: userEvent?.verifier?.name || "N/A",
    enclosure_no: userEvent?.enclosure_no || "N/A",
    photo: user.photo ?? DEFAULT_PHOTO,
    venue: event.location || "N/A",
  };
}

/**
 * Build flat variable map for verification email templates.
 * Available variables: {{jwt_access_token}}, {{qr_url}}, {{event_title}},
 * {{user_name}}, {{email}}, {{time}}, {{date}}, {{verifier}},
 * {{invitation_url}}, {{gbpuat_logo}}, {{venue}}, {{entry_gate}},
 * {{enclosure_no}}
 */
function buildEmailVariables(
  eventId: string,
  params: {
    jwtAccessToken: string;
    event: any;
    user: any;
    time: string;
    date: string;
    verifier: string;
    enclosure_no: string;
  }
): Record<string, string> {
  const { jwtAccessToken, event, user, time, date, verifier, enclosure_no } = params;
  const userEvent = user.events?.get?.(eventId);

  return {
    jwt_access_token: jwtAccessToken,
    qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${jwtAccessToken}`,
    event_title: event.title ?? "",
    user_name: user.name ?? "",
    email: user.email ?? "",
    time,
    date,
    verifier,
    invitation_url: userEvent?.invitation ?? "",
    gbpuat_logo: process.env.GBPUAT_LOGO_IMAGE ?? "",
    venue: event.location ?? "",
    entry_gate: userEvent?.entry_gate || "N/A",
    enclosure_no: enclosure_no || "N/A",
  };
}

// ─── Bridge Functions (DB Template required) ──────────────────────────

/**
 * Get invitation PDF HTML from DB template.
 * Throws if no template found or variable replacement fails.
 */
export async function getInvitationHTML(
  eventId: string,
  user: any,
  verifier: string,
  enclosure_no: string,
  entry_gate: string | null
): Promise<string> {
  const template = await Template.findOne({
    event: new mongoose.Types.ObjectId(eventId),
    type: "pdf_html",
  });

  if (!template) {
    throw new Error(`No invitation template found for this event. Please create a PDF template first.`);
  }

  const data = buildInvitationVariables(eventId, user, verifier, enclosure_no, entry_gate);
  const result = replaceTemplateVariables(template.html, data, template.requiredVariables);

  if (!result.success || !result.html) {
    throw new Error(`Template variable replacement failed (missing: ${result.missingVariables?.join(", ")})`);
  }

  return result.html;
}

/**
 * Get faculty ID card HTML from DB template.
 * Throws if no template found or variable replacement fails.
 */
export async function getFacultyIdHTML(
  event: any,
  user: any
): Promise<string> {
  const eventId = event._id?.toString?.() ?? event._id;
  const template = await Template.findOne({
    event: new mongoose.Types.ObjectId(eventId),
    type: "pdf_html",
  });

  if (!template) {
    throw new Error(`No faculty ID template found for this event. Please create a PDF template first.`);
  }

  const data = buildFacultyIdVariables(event, user);
  const result = replaceTemplateVariables(template.html, data, template.requiredVariables);

  if (!result.success || !result.html) {
    throw new Error(`Template variable replacement failed (missing: ${result.missingVariables?.join(", ")})`);
  }

  return result.html;
}

/**
 * Get verification email HTML from DB template.
 * Throws if no template found or variable replacement fails.
 */
export async function getVerificationEmailHTML(
  eventId: string,
  params: {
    jwtAccessToken: string;
    event: any;
    user: any;
    time: string;
    date: string;
    verifier: string;
    enclosure_no: string;
  }
): Promise<string> {
  const template = await Template.findOne({
    event: new mongoose.Types.ObjectId(eventId),
    type: "email_html",
  });

  if (!template) {
    throw new Error(`No email template found for this event. Please create an email template first.`);
  }

  const data = buildEmailVariables(eventId, params);
  const result = replaceTemplateVariables(template.html, data, template.requiredVariables);

  if (!result.success || !result.html) {
    throw new Error(`Template variable replacement failed (missing: ${result.missingVariables?.join(", ")})`);
  }

  return result.html;
}
