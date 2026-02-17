export type TemplateType = "email_html" | "pdf_html";

export default interface Template {
  _id: string;
  event: string;
  name: string;
  type: TemplateType;
  source: string;
  html: string;
  variables: string[];
  requiredVariables: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
