"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  MapPin,
  Clock,
  FileText,
  Mail,
  Users,
  Edit,
  Upload,
  CheckCircle,
  AlertCircle,
  XCircle,
  IdCard,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";
import Event from "@/types/Event";
import Template from "@/types/Template";
import { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  setFileUploadModalEventID,
  setFileUploadModalStatus,
} from "@/store/fileUploadModalSlice";
import {
  increaseEmailsSent,
  increaseIdCardsGenerated,
  increaseInvitationsGenerated,
} from "@/store/eventsSlice";
import { toast } from "sonner";
import Link from "next/link";
import axios from "axios";
import { TemplateEditorModal } from "./TemplateEditorModal";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EventCardProps {
  event: Event;
  onEdit: (id: string) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [emailPercentage, setEmailPercentage] = useState<number>(0);
  const [invitationPercentage, setInvitationPercentage] = useState<number>(0);
  const [emailsNotSent, setEmailsNotSent] = useState<number>(0);
  const [emailSendLoading, setEmailSendLoading] = useState<boolean>(false);
  const [invitationGenerateLoading, setInvitationGenerateLoading] =
    useState<boolean>(false);
  const [idCardsGeneratedPercentage, setIdCardsGeneratedPercentage] = useState<number>(0);
  const [idCardGenerateLoading, setIdCardGenerateLoading] = useState<boolean>(false);

  // Template state
  const [emailTemplate, setEmailTemplate] = useState<Template | null>(null);
  const [pdfTemplate, setPdfTemplate] = useState<Template | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<"email_html" | "pdf_html">("email_html");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  const dispatch = useDispatch();

  // Fetch templates for this event
  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const res = await axios.get(`/api/templates?eventId=${event._id}`);
      const templates: Template[] = res.data;
      setEmailTemplate(templates.find((t) => t.type === "email_html") || null);
      setPdfTemplate(templates.find((t) => t.type === "pdf_html") || null);
    } catch {
      // silent — templates just won't be available
    } finally {
      setTemplatesLoading(false);
    }
  }, [event._id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const hasEmailTemplate = !!emailTemplate;
  const hasPdfTemplate = !!pdfTemplate;

  const handleTemplateSaved = (saved: Template) => {
    if (saved.type === "email_html") setEmailTemplate(saved);
    else setPdfTemplate(saved);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/templates?_id=${deleteTarget._id}`);
      if (deleteTarget.type === "email_html") setEmailTemplate(null);
      else setPdfTemplate(null);
      toast.success("Template deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const date = new Date(event.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeString = `${date.getHours()}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  // SSE: Send Verification Emails
  const handleSendingEmail = async (eventId: string) => {
    setEmailSendLoading(true);
    setEmailsNotSent(0);

    const toastId = toast.loading("Sending emails...", {
      description: "Initializing email batch process...",
    });

    try {
      const response = await fetch("/api/send-verification-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start email stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.status) {
              case "started":
                toast.loading(`Sending to ${data.total} users...`, {
                  id: toastId,
                  description: `Event: ${data.eventTitle}`,
                });
                break;

              case "batch_complete":
                dispatch(
                  increaseEmailsSent({
                    _id: eventId,
                    increase: data.batchSuccessful,
                  })
                );
                toast.loading(
                  `Batch ${data.batch}/${data.totalBatches} complete`,
                  {
                    id: toastId,
                    description: `${data.totalProcessed}/${data.total} processed`,
                  }
                );
                break;

              case "complete":
                toast.dismiss(toastId);
                if (data.failed > 0) {
                  setEmailsNotSent(data.failed);
                  toast.error(`Failed to send ${data.failed} emails`, {
                    description: "Check logs for details.",
                    icon: <XCircle className="h-4 w-4" />,
                  });
                } else {
                  toast.success(`All ${data.successful} emails sent!`, {
                    icon: <CheckCircle className="h-4 w-4" />,
                  });
                }
                break;

              case "error":
                toast.dismiss(toastId);
                toast.error("Email sending failed", {
                  description: data.message || "Unknown error",
                  icon: <AlertCircle className="h-4 w-4" />,
                });
                break;
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to send emails", {
        description: "Please try again later.",
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setEmailSendLoading(false);
    }
  };

  // SSE: Generate Invitations
  const handleInvitationGeneration = async (eventId: string) => {
    setInvitationGenerateLoading(true);

    const toastId = toast.loading("Generating invitations...", {
      description: "Processing participant data...",
    });

    try {
      const response = await fetch("/api/generate-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start invitation stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.status === "batch_complete") {
              dispatch(
                increaseInvitationsGenerated({
                  _id: eventId,
                  increase: data.batchSuccessful,
                })
              );
              toast.loading(
                `Batch ${data.batch}/${data.totalBatches} complete`,
                {
                  id: toastId,
                  description: `${data.totalProcessed}/${data.total} processed`,
                }
              );
            }

            if (data.status === "complete") {
              toast.dismiss(toastId);
              if (data.errors?.length > 0) {
                toast.warning(
                  `${data.errors.length} errors during generation`,
                  {
                    description: "Check console for details.",
                    icon: <AlertCircle className="h-4 w-4" />,
                  }
                );
              } else {
                toast.success(`All ${data.successful} invitations generated!`, {
                  icon: <CheckCircle className="h-4 w-4" />,
                });
              }
            }

            if (data.status === "error") {
              toast.dismiss(toastId);
              toast.error("Invitation generation failed", {
                description: data.message || "Unknown error",
                icon: <XCircle className="h-4 w-4" />,
              });
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to generate invitations", {
        description: "Please try again.",
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setInvitationGenerateLoading(false);
    }
  };

  const handleIdCardGeneration = async (eventId: string) => {
    setIdCardGenerateLoading(true);

    const toastId = toast.loading("Generating ID cards...", {
      description: "Processing faculty data...",
    });

    try {
      const response = await fetch("/api/generate-faculty-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start ID card generation stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            switch (data.status) {
              case "started":
                toast.loading(`Processing ${data.total} faculties...`, {
                  id: toastId,
                  description: `Event: ${data.eventTitle}`,
                });
                break;

              case "batch_complete":
                // Note: You'll need to add an increaseIdCardsGenerated action to your Redux store
                // similar to increaseInvitationsGenerated
                dispatch(
                  increaseIdCardsGenerated({
                    _id: eventId,
                    increase: data.batchSuccessful,
                  })
                );
                toast.loading(
                  `Batch ${data.batch}/${data.totalBatches} complete`,
                  {
                    id: toastId,
                    description: `${data.totalProcessed}/${data.total} processed (${data.percentage}%)`,
                  }
                );
                break;

              case "complete":
                toast.dismiss(toastId);
                if (data.failed > 0) {
                  toast.warning(
                    `${data.failed} ID cards failed to generate`,
                    {
                      description: `${data.successful} successful. Check logs for details.`,
                      icon: <AlertCircle className="h-4 w-4" />,
                    }
                  );
                } else {
                  toast.success(`All ${data.successful} ID cards generated!`, {
                    icon: <CheckCircle className="h-4 w-4" />,
                  });
                }
                break;

              case "error":
                toast.dismiss(toastId);
                toast.error("ID card generation failed", {
                  description: data.message || "Unknown error",
                  icon: <XCircle className="h-4 w-4" />,
                });
                break;
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        }
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to generate ID cards", {
        description: "Please try again later.",
        icon: <XCircle className="h-4 w-4" />,
      });
    } finally {
      setIdCardGenerateLoading(false);
    }
  };

  // Update percentages
  useEffect(() => {
    const participants = event.participants;
    setAttendancePercentage(
      participants > 0 ? (event.attended / participants) * 100 : 0
    );
    setEmailPercentage(
      participants > 0 ? (event.emails_sent / participants) * 100 : 0
    );
    setInvitationPercentage(
      participants > 0 ? (event.invitations_generated / participants) * 100 : 0
    );
    setIdCardsGeneratedPercentage(
      participants > 0 ? (event.id_card_generated / event.faculties) * 100 : 0
    );
  }, [
    event.attended,
    event.participants,
    event.emails_sent,
    event.invitations_generated,
    event.id_card_generated,
    event.faculties,
  ]);

  // Auto-toast on failure threshold
  useEffect(() => {
    if (emailsNotSent >= 5) {
      toast.error(`Failed to send ${emailsNotSent} emails`, {
        description: "Process terminated.",
        icon: <XCircle className="h-4 w-4" />,
      });
      setEmailSendLoading(false);
    }
  }, [emailsNotSent]);

  // Auto-success when 100%
  useEffect(() => {
    if (emailPercentage >= 100 && emailSendLoading) {
      toast.success("Emails sent to all participants!", {
        icon: <CheckCircle className="h-4 w-4" />,
      });
      setEmailSendLoading(false);
    }
  }, [emailPercentage, emailSendLoading]);

  return (
    <Card className="w-full max-w-lg transition-shadow hover:shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <Link
              href={`/admin/${event._id}`}
              className="hover:underline hover:text-primary"
            >
              {event.title}
            </Link>
          </CardTitle>
          <Badge
            variant={event.status === "active" ? "default" : "destructive"}
            className={`${event.status === "active" ? "bg-green-500" : "bg-red-500"}`}
          >
            {event.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-green-600" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>{timeString}</span>
          </div>
        </div>

        {/* Progress Stats */}
        {event.participants > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs font-medium mb-1">
              <Users className="w-4 h-4" />
              Attendance
            </div>
            <Progress value={attendancePercentage} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{event.attended} / {event.participants}</span>
              <span>{attendancePercentage.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* ── EMAIL: Template + Send ── */}
        <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold">Emails</span>
            </div>
            {templatesLoading ? (
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            ) : hasEmailTemplate ? (
              <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-blue-600">
                Template v{emailTemplate!.version}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                No Template
              </Badge>
            )}
          </div>

          {/* Email progress bar */}
          {event.participants > 0 && (
            <div>
              <Progress value={emailPercentage} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{event.emails_sent} / {event.participants} sent</span>
                <span>{emailPercentage.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Template + Send row */}
          <div className="flex gap-1.5">
            {templatesLoading ? (
              <div className="h-8 flex-1 rounded bg-muted animate-pulse" />
            ) : hasEmailTemplate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2"
                  onClick={() => {
                    setEditingTemplate(emailTemplate);
                    setEditorType("email_html");
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewTemplate(emailTemplate)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(emailTemplate)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setEditingTemplate(null);
                  setEditorType("email_html");
                  setEditorOpen(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Upload MJML Template
              </Button>
            )}

            <div className="flex-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleSendingEmail(event._id)}
                      disabled={emailSendLoading || emailPercentage >= 100 || !hasEmailTemplate}
                    >
                      {emailSendLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Sending…
                        </>
                      ) : emailPercentage >= 100 ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sent
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3 mr-1" />
                          Send Emails
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!hasEmailTemplate && (
                  <TooltipContent>
                    <p>Upload an email template first</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── PDF INVITATIONS: Template + Generate ── */}
        <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">PDF Invitations</span>
            </div>
            {templatesLoading ? (
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            ) : hasPdfTemplate ? (
              <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600">
                Template v{pdfTemplate!.version}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                No Template
              </Badge>
            )}
          </div>

          {/* Invitation progress bar */}
          {event.participants > 0 && (
            <div>
              <Progress value={invitationPercentage} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{event.invitations_generated} / {event.participants} generated</span>
                <span>{invitationPercentage.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Template + Generate row */}
          <div className="flex gap-1.5">
            {templatesLoading ? (
              <div className="h-8 flex-1 rounded bg-muted animate-pulse" />
            ) : hasPdfTemplate ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2"
                  onClick={() => {
                    setEditingTemplate(pdfTemplate);
                    setEditorType("pdf_html");
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewTemplate(pdfTemplate)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(pdfTemplate)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setEditingTemplate(null);
                  setEditorType("pdf_html");
                  setEditorOpen(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Upload HTML Template
              </Button>
            )}

            <div className="flex-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleInvitationGeneration(event._id)}
                      disabled={invitationGenerateLoading || event.invitations_generated >= event.participants || !hasPdfTemplate}
                    >
                      {invitationGenerateLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating…
                        </>
                      ) : event.invitations_generated >= event.participants ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Generated
                        </>
                      ) : (
                        <>
                          <FileText className="h-3 w-3 mr-1" />
                          Generate PDFs
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!hasPdfTemplate && (
                  <TooltipContent>
                    <p>Upload a PDF template first</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ── ID CARDS ── */}
        <div className="rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold">Faculty ID Cards</span>
            </div>
          </div>

          {event.faculties > 0 && (
            <div>
              <Progress value={idCardsGeneratedPercentage} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{event.id_card_generated} / {event.faculties} generated</span>
                <span>{idCardsGeneratedPercentage.toFixed(0)}%</span>
              </div>
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700"
            onClick={async () => await handleIdCardGeneration(event._id)}
            disabled={idCardGenerateLoading || event.id_card_generated >= event.faculties}
          >
            {idCardGenerateLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating…
              </>
            ) : event.id_card_generated >= event.faculties ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                ID Cards Generated
              </>
            ) : (
              <>
                <IdCard className="h-3 w-3 mr-1" />
                Generate ID Cards
              </>
            )}
          </Button>
        </div>

        {/* ── BOTTOM ACTIONS: Edit Event + Upload User Data ── */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(event._id)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Event
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              dispatch(setFileUploadModalStatus(true));
              dispatch(setFileUploadModalEventID(event._id));
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload User Data
          </Button>
        </div>
      </CardContent>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        eventId={event._id}
        template={editingTemplate}
        defaultType={editorType}
        onSaved={handleTemplateSaved}
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
                style={{ height: previewTemplate?.type === "pdf_html" ? "842px" : "500px" }}
                title="Template Preview"
              />
            </div>
          )}
          {previewTemplate && previewTemplate.variables.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium text-muted-foreground">Variables</p>
              <div className="flex flex-wrap gap-1">
                {previewTemplate.variables.map((v) => (
                  <Badge
                    key={v}
                    variant={previewTemplate.requiredVariables.includes(v) ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {"{{" + v + "}}"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
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
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteTemplate} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}