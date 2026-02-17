import mongoose, { Schema, Document } from "mongoose";

export interface ITemplate extends Document {
  event: Schema.Types.ObjectId;
  name: string;
  type: "email_html" | "pdf_html";
  source: string;
  html: string;
  variables: string[];
  requiredVariables: string[];
  version: number;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      required: true,
      enum: ["email_html", "pdf_html"],
    },
    html: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: "",
    },
    variables: {
      type: [String],
      default: [],
    },
    requiredVariables: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  { timestamps: true }
);

// Compound index: one template per type per event
TemplateSchema.index({ event: 1, type: 1 }, { unique: true });

export const Template =
  mongoose.models.Template ||
  mongoose.model<ITemplate>("Template", TemplateSchema);
