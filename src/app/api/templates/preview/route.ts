import { connect } from "@/config/database/mongoDBConfig";
import { getUserFromHeader } from "@/helpers/common_func";
import {
  compileMJML,
  extractVariables,
  isMJML,
  sanitizeHTML,
  validateEmailTemplate,
  validatePDFTemplate,
} from "@/lib/templateUtils";
import { NextRequest, NextResponse } from "next/server";

connect();

/**
 * POST /api/templates/preview
 * Accepts { source, type } and returns compiled/sanitized HTML preview
 * plus extracted variables. Does NOT persist anything.
 */
export async function POST(req: NextRequest) {
  try {
    await getUserFromHeader(req, true);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { source, type } = body;

    if (!source || !type) {
      return NextResponse.json(
        { message: "source and type are required" },
        { status: 400 }
      );
    }

    if (type !== "email_html" && type !== "pdf_html") {
      return NextResponse.json(
        { message: 'type must be "email_html" or "pdf_html"' },
        { status: 400 }
      );
    }

    const validation =
      type === "email_html"
        ? validateEmailTemplate(source)
        : validatePDFTemplate(source);

    return NextResponse.json(
      {
        valid: validation.valid,
        errors: validation.errors,
        html: validation.html || null,
        variables: validation.variables,
      },
      { status: validation.valid ? 200 : 422 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
