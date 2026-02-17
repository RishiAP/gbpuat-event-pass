import { connect } from "@/config/database/mongoDBConfig";
import { getUserFromHeader } from "@/helpers/common_func";
import {
  validateEmailTemplate,
  validatePDFTemplate,
  extractVariables,
} from "@/lib/templateUtils";
import { Event } from "@/models/Event";
import { Template } from "@/models/Template";
import { NextRequest, NextResponse } from "next/server";

connect();

// ─── GET: Fetch templates for an event ──────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await getUserFromHeader(req, true);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const templateId = url.searchParams.get("_id");
  const type = url.searchParams.get("type");

  try {
    // Fetch single template by ID
    if (templateId) {
      const template = await Template.findById(templateId);
      if (!template) {
        return NextResponse.json(
          { message: "Template not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(template, { status: 200 });
    }

    // Fetch all templates for an event
    if (!eventId) {
      return NextResponse.json(
        { message: "eventId query parameter is required" },
        { status: 400 }
      );
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    const filter: Record<string, string> = { event: eventId };
    if (type && (type === "email_html" || type === "pdf_html")) {
      filter.type = type;
    }

    const templates = await Template.find(filter).sort({ updatedAt: -1 });
    return NextResponse.json(templates, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new template ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await getUserFromHeader(req, true);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { eventId, name, type, source } = body;

    // Basic input validation
    if (!eventId || !name || !type || !source) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: eventId, name, type, source",
        },
        { status: 400 }
      );
    }

    if (type !== "email_html" && type !== "pdf_html") {
      return NextResponse.json(
        { message: 'type must be "email_html" or "pdf_html"' },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        { message: "Template name must be 200 characters or less" },
        { status: 400 }
      );
    }

    // Check event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    // Validate based on type
    const validation =
      type === "email_html"
        ? validateEmailTemplate(source)
        : validatePDFTemplate(source);

    if (!validation.valid || !validation.html) {
      return NextResponse.json(
        {
          message: "Template validation failed",
          errors: validation.errors,
          variables: validation.variables,
        },
        { status: 422 }
      );
    }

    // Check for duplicate type within event (only one template per type per event)
    const existing = await Template.findOne({
      event: eventId,
      type,
    });
    if (existing) {
      return NextResponse.json(
        {
          message: `A ${type} template already exists for this event. Edit the existing one or delete it first.`,
        },
        { status: 409 }
      );
    }

    // All detected variables are mandatory
    const template = await Template.create({
      event: eventId,
      name,
      type,
      source,
      html: validation.html,
      variables: validation.variables,
      requiredVariables: validation.variables,
      version: 1,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { message: "A template with this name already exists for this event and type" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT: Update an existing template ──────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    await getUserFromHeader(req, true);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { _id, name, source } = body;

    if (!_id) {
      return NextResponse.json(
        { message: "Template _id is required" },
        { status: 400 }
      );
    }

    const template = await Template.findById(_id);
    if (!template) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }

    // If source is provided, re-validate
    if (source) {
      const validation =
        template.type === "email_html"
          ? validateEmailTemplate(source)
          : validatePDFTemplate(source);

      if (!validation.valid || !validation.html) {
        return NextResponse.json(
          {
            message: "Template validation failed",
            errors: validation.errors,
            variables: validation.variables,
          },
          { status: 422 }
        );
      }

      // All detected variables are mandatory
      template.source = source;
      template.html = validation.html;
      template.variables = validation.variables;
      template.requiredVariables = validation.variables;
      template.version += 1;
    }

    if (name) {
      if (name.length > 200) {
        return NextResponse.json(
          { message: "Template name must be 200 characters or less" },
          { status: 400 }
        );
      }
      template.name = name;
    }

    await template.save();
    return NextResponse.json(template, { status: 200 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { message: "A template with this name already exists for this event and type" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove a template ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    await getUserFromHeader(req, true);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const _id = url.searchParams.get("_id");

  if (!_id) {
    return NextResponse.json(
      { message: "Template _id is required" },
      { status: 400 }
    );
  }

  try {
    const deleted = await Template.findByIdAndDelete(_id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: "Template deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
