"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import Template, { TemplateType } from "@/types/Template";
import { AlertCircle, CheckCircle2, Code, Eye, Loader2 } from "lucide-react";

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  template?: Template | null;
  defaultType?: TemplateType;
  onSaved: (template: Template) => void;
}

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;
const CONTROL_KEYWORDS = new Set(["if", "else", "endif"]);

function extractClientVariables(source: string): string[] {
  const vars = new Set<string>();
  // Standard variables (skip control keywords)
  const matches = source.matchAll(VARIABLE_REGEX);
  for (const m of matches) {
    if (!CONTROL_KEYWORDS.has(m[1])) {
      vars.add(m[1]);
    }
  }
  // Variables used in conditionals: {{#if var_name}}
  const condMatches = source.matchAll(/\{\{#if\s+(\w+)\}\}/g);
  for (const m of condMatches) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

export function TemplateEditorModal({
  isOpen,
  onClose,
  eventId,
  template,
  defaultType,
  onSaved,
}: TemplateEditorModalProps) {
  const isEditing = !!template;

  const [name, setName] = useState(template?.name || "");
  const [type, setType] = useState<TemplateType>(
    template?.type || "email_html"
  );
  const [source, setSource] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [detectedVars, setDetectedVars] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setName(template?.name || "");
      setType(template?.type || defaultType || "email_html");
      setSource(template?.source || template?.html || "");
      setPreviewHtml(null);
      setDetectedVars(template?.variables || []);
      setValidationErrors([]);
      setIsValid(null);
      setActiveTab("editor");
    }
  }, [isOpen, template, defaultType]);

  // Client-side variable detection on source change
  useEffect(() => {
    if (source.trim()) {
      const vars = extractClientVariables(source);
      setDetectedVars(vars);
    } else {
      setDetectedVars([]);
    }
  }, [source]);

  // Client-side format validation
  useEffect(() => {
    if (!source.trim()) {
      setValidationErrors([]);
      setIsValid(null);
      return;
    }

    const errors: string[] = [];
    const hasMJMLTags =
      /<mjml[\s>]/i.test(source) || /<mj-/i.test(source);
    const hasHTMLTags = /<[a-z][\s\S]*>/i.test(source);

    if (type === "email_html") {
      if (!hasMJMLTags) {
        errors.push(
          "Email templates must use MJML format. Wrap your content in <mjml> and <mj-body> tags."
        );
      }
    } else {
      if (hasMJMLTags) {
        errors.push(
          "PDF templates must use plain HTML. MJML is not accepted."
        );
      } else if (!hasHTMLTags) {
        errors.push("Input does not appear to be valid HTML.");
      }
    }

    setValidationErrors(errors);
    setIsValid(errors.length === 0);
  }, [source, type]);

  const handlePreview = useCallback(async () => {
    if (!source.trim()) {
      toast.error("Enter template source first");
      return;
    }

    setPreviewing(true);
    try {
      const res = await axios.post("/api/templates/preview", {
        source,
        type,
      });

      if (res.data.valid) {
        setPreviewHtml(res.data.html);
        setDetectedVars(res.data.variables);
        setValidationErrors([]);
        setIsValid(true);
        setActiveTab("preview");
        toast.success("Template compiled successfully");
      } else {
        setValidationErrors(res.data.errors || []);
        setIsValid(false);
        toast.error("Template validation failed");
      }
    } catch (err: any) {
      const data = err.response?.data;
      setValidationErrors(data?.errors || [data?.message || "Preview failed"]);
      setIsValid(false);
      toast.error("Preview failed");
    } finally {
      setPreviewing(false);
    }
  }, [source, type]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!source.trim()) {
      toast.error("Template source is required");
      return;
    }
    if (validationErrors.length > 0) {
      toast.error("Fix validation errors before saving");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        eventId,
        name: name.trim(),
        type,
        source,
        ...(isEditing ? { _id: template!._id } : {}),
      };

      const res = isEditing
        ? await axios.put("/api/templates", payload)
        : await axios.post("/api/templates", payload);

      onSaved(res.data);
      toast.success(
        isEditing ? "Template updated" : "Template created"
      );
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      toast.error(data?.message || "Failed to save template");
      if (data?.errors) {
        setValidationErrors(data.errors);
      }
    } finally {
      setSaving(false);
    }
  }, [
    name,
    source,
    type,
    eventId,

    validationErrors,
    isEditing,
    template,
    onSaved,
    onClose,
  ]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="4xl"
      closeOnOverlay={!saving}
      closeOnEsc={!saving}
    >
      <ModalHeader>
        <ModalTitle>
          {isEditing ? "Edit Template" : "Create Template"}
        </ModalTitle>
        <ModalDescription>
          {type === "email_html"
            ? "Write your email template using MJML markup. It will be compiled to responsive HTML."
            : "Write your PDF invitation template using clean HTML."}
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-4">
          {/* Name & Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g. Welcome Email"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as TemplateType);
                  setPreviewHtml(null);
                  setIsValid(null);
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_html">
                    Email Template (MJML)
                  </SelectItem>
                  <SelectItem value="pdf_html">
                    PDF Invitation (HTML)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Validation Status */}
          {validationErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 space-y-1">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                Validation Errors
              </div>
              <ul className="text-sm text-destructive list-disc list-inside">
                {validationErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {isValid === true && validationErrors.length === 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Template is valid
              </div>
            </div>
          )}

          {/* Editor / Preview Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <div className="space-y-2">
                <Label>
                  {type === "email_html"
                    ? "MJML Source"
                    : "HTML Source"}
                </Label>
                <textarea
                  className="w-full min-h-[300px] font-mono text-sm p-3 border rounded-md bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  placeholder={
                    type === "email_html"
                      ? `<mjml>\n  <mj-body>\n    <mj-section>\n      <mj-column>\n        <mj-text>Hello {{name}}</mj-text>\n      </mj-column>\n    </mj-section>\n  </mj-body>\n</mjml>`
                      : `<html>\n  <body>\n    <h1>Invitation for {{name}}</h1>\n    <p>Event: {{event_title}}</p>\n  </body>\n</html>`
                  }
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </TabsContent>

            <TabsContent value="preview">
              {previewHtml ? (
                <div className="border rounded-md overflow-hidden bg-white">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: type === "pdf_html" ? "842px" : "500px" }}
                    title="Template Preview"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Eye className="h-12 w-12 mb-3 opacity-40" />
                  <p>Click &quot;Preview&quot; to compile and view the template</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Detected Variables (all mandatory — detected by backend) */}
          {detectedVars.length > 0 && (
            <div className="space-y-2">
              <Label>
                Detected Variables{" "}
                <span className="text-muted-foreground text-xs">
                  (all mandatory)
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {detectedVars.map((v) => (
                  <Badge key={v} variant="default">
                    {"{{" + v + "}}"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
      </ModalBody>

      <ModalFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={previewing || !source.trim()}
          >
            {previewing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Compiling…
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !source.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : isEditing ? (
              "Update Template"
            ) : (
              "Create Template"
            )}
          </Button>
      </ModalFooter>
    </Modal>
  );
}
