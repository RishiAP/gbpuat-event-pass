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
} from "lucide-react";
import Event from "@/types/Event";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  setFileUploadModalEventID,
  setFileUploadModalStatus,
} from "@/store/fileUploadModalSlice";
import {
  increaseEmailsSent,
  increaseInvitationsGenerated,
} from "@/store/eventsSlice";
import { toast } from "sonner";
import Link from "next/link";

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

  const dispatch = useDispatch();

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
      <CardHeader className="pb-3">
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
            variant={event.status === "Active" ? "default" : "destructive"}
          >
            {event.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
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
          <div className="space-y-4 pt-2 border-t">
            {/* Attendance */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Users className="w-4 h-4" />
                Attendance
              </div>
              <Progress value={attendancePercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {event.attended} / {event.participants}
                </span>
                <span>{attendancePercentage.toFixed(0)}%</span>
              </div>
            </div>

            {/* Invitations */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <FileText className="w-4 h-4" />
                Invitations Generated
              </div>
              <Progress value={invitationPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {event.invitations_generated} / {event.participants}
                </span>
                <span>{invitationPercentage.toFixed(0)}%</span>
              </div>
            </div>
            {/* ID Cards Generated */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <FileText className="w-4 h-4" />
                ID Cards Generated
              </div>
              <Progress value={idCardsGeneratedPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {event.id_card_generated} / {event.faculties}
                </span>
                <span>{idCardsGeneratedPercentage.toFixed(0)}%</span>
              </div>
            </div>

            {/* Emails */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Mail className="w-4 h-4" />
                Emails Sent
              </div>
              <Progress value={emailPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {event.emails_sent} / {event.participants}
                </span>
                <span>{emailPercentage.toFixed(0)}%</span>
              </div>
            </div>

            {/* Send Email Button */}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleSendingEmail(event._id)}
              disabled={emailSendLoading || emailPercentage >= 100}
            >
              {emailSendLoading ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {emailPercentage >= 100 ? "Sent" : "Send Emails"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(event._id)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
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
            Upload
          </Button>
        </div>

        {/* Generate Invitations */}
        <Button
          className="w-full"
          variant="default"
          onClick={() => handleInvitationGeneration(event._id)}
          disabled={invitationGenerateLoading || event.invitations_generated >= event.participants}
        >
          {invitationGenerateLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              {event.invitations_generated >= event.participants
                ? "Invitations Generated"
                : "Generate Invitations"}
            </>
          )}
        </Button>
        {/* Generate ID Cards */}
        <Button
          className="w-full"
          variant="default"
          onClick={async () => await handleIdCardGeneration(event._id)}
          disabled={idCardGenerateLoading || event.id_card_generated >= event.faculties}
        >
          {idCardGenerateLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <IdCard className="mr-2 h-4 w-4" />
              {event.id_card_generated >= event.faculties
                ? "ID Cards Generated"
                : "Generate ID Cards"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}