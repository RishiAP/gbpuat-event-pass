"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Code,
  Eye,
  FileText,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Template from "@/types/Template";
import { TemplateEditorModal } from "./TemplateEditorModal";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

interface TemplateManagerProps {
  eventId: string;
}

export function TemplateManager({ eventId }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/templates?eventId=${eventId}`);
      setTemplates(res.data);
    } catch (err: any) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const emailTemplates = templates.filter((t) => t.type === "email_html");
  const pdfTemplates = templates.filter((t) => t.type === "pdf_html");

  const handleSaved = (saved: Template) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/templates?_id=${deleteTarget._id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== deleteTarget!._id));
      toast.success("Template deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const renderTemplateCard = (template: Template) => (
    <Card
      key={template._id}
      className="hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge
            variant={template.type === "email_html" ? "default" : "secondary"}
          >
            {template.type === "email_html" ? (
              <><Mail className="h-3 w-3 mr-1" />Email</>
            ) : (
              <><FileText className="h-3 w-3 mr-1" />PDF</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Variables</p>
            <div className="flex flex-wrap gap-1">
              {template.variables.map((v) => (
                <Badge
                  key={v}
                  variant={
                    template.requiredVariables.includes(v)
                      ? "default"
                      : "outline"
                  }
                  className="text-[10px] py-0"
                >
                  {"{{" + v + "}}"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v{template.version}</span>
          <span>
            {new Date(template.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setPreviewTemplate(template)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setEditingTemplate(template);
              setEditorOpen(true);
            }}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteTarget(template)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Templates</h2>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email ({emailTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF ({pdfTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          {emailTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No email templates yet</p>
              <p className="text-sm">Create one using MJML markup</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailTemplates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pdf">
          {pdfTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">No PDF templates yet</p>
              <p className="text-sm">Create one using clean HTML</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfTemplates.map(renderTemplateCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        eventId={eventId}
        template={editingTemplate}
        onSaved={handleSaved}
      />

      {/* Preview Modal */}
      <Modal
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        size="page"
      >
        <ModalHeader>
          <ModalTitle>{previewTemplate?.name} — Preview</ModalTitle>
          <ModalDescription>
            {previewTemplate?.type === "email_html"
              ? "Email template preview"
              : "PDF invitation template preview"}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          {previewTemplate?.html && (
            <div className="border rounded-md overflow-hidden bg-white">
              <iframe
                srcDoc={previewTemplate.html}
                className="w-full border-0"
                style={{ height: previewTemplate.type === "pdf_html" ? "842px" : "500px" }}
                title="Template Preview"
              />
            </div>
          )}

          {previewTemplate && previewTemplate.variables.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                Variables
              </p>
              <div className="flex flex-wrap gap-2">
                {previewTemplate.variables.map((v) => (
                  <Badge
                    key={v}
                    variant={
                      previewTemplate.requiredVariables.includes(v)
                        ? "default"
                        : "outline"
                    }
                  >
                    {"{{" + v + "}}"}
                    {previewTemplate.requiredVariables.includes(v) && (
                      <span className="ml-1 text-[10px]">required</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setPreviewTemplate(null)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        closeOnOverlay={!deleting}
        closeOnEsc={!deleting}
      >
        <ModalHeader>
          <ModalTitle>Delete Template</ModalTitle>
          <ModalDescription>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
            This action cannot be undone.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
