import { Card, Progress, Button, Label } from "flowbite-react";
import { FiEdit, FiUpload, FiCheckCircle, FiUser } from 'react-icons/fi';
import { FaCalendarCheck, FaMailBulk } from "react-icons/fa";
import { FaClock, FaFilePdf, FaLocationDot } from "react-icons/fa6";
import Event from "@/types/Event";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFileUploadModalEventID, setFileUploadModalStatus } from "@/store/fileUploadModalSlice";
import { increaseEmailsSent, setEvents, increaseInvitationsGenerated } from "@/store/eventsSlice";
import { toast } from "react-toastify";
import Link from "next/link";

interface EventCardProps {
    event: Event;
    onEdit: (id: string) => void;
    onUploadData: (id: string) => void;
  }

export function EventCard({ event, onEdit, onUploadData }:EventCardProps) {
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [emailPercentage, setEmailPercentage] = useState<number>(0);
  const [invitationPercentage, setInvitationPercentage] = useState<number>(0);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const [emailsNotSent, setEmailsNotSent] = useState<number>(0);
  const [emailSendLoading, setEmailSendLoading] = useState<boolean>(false);
  const [invitationGenerateLoading, setInvitationGenerateLoading] = useState<boolean>(false);
  const date=new Date(event.date);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  async function handleSendingEmail(eventId: string) {
    console.log("Sending verification emails");
    setEmailSendLoading(true);

    try {
      const response = await fetch("/api/send-verification-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Email sending stream complete");
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Split by newlines to handle multiple SSE messages in one chunk
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              // Handle different status types
              switch (data.status) {
                case "started":
                  console.log(
                    `Started sending emails to ${data.total} users for ${data.eventTitle}`
                  );
                  break;

                case "batch_started":
                  console.log(
                    `Email Batch ${data.batch}/${data.totalBatches} started (${data.batchSize} users)`
                  );
                  break;

                case "batch_complete":
                  console.log(
                    `Email Batch ${data.batch}/${data.totalBatches} complete:`,
                    {
                      successful: data.batchSuccessful,
                      failed: data.batchFailed,
                      progress: `${data.totalProcessed}/${data.total}`,
                    }
                  );
                  dispatch(
                    increaseEmailsSent({
                      _id: eventId,
                      increase: data.batchSuccessful,
                    })
                  );
                  break;

                case "complete":
                  console.log("All emails processed:", {
                    total: data.total,
                    successful: data.successful,
                    failed: data.failed,
                  });

                  if (data.failedEmails && data.failedEmails.length > 0) {
                    console.error("Failed emails:", data.failedEmails);
                    toast.error(
                      `Failed to send emails to ${data.failed} participants`
                    );
                  } else {
                    toast.success(
                      `All ${data.successful} emails sent successfully!`
                    );
                  }

                  setEmailsNotSent(data.failed);
                  break;

                case "error":
                  console.error("Server error:", data.message);
                  toast.error(`Error sending emails: ${data.message}`);
                  break;

                default:
                  console.log("Unknown status:", data);
              }
            } catch (e) {
              console.error("Error parsing SSE message:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending verification emails:", error);
      toast.error("Failed to send emails. Please try again.");
    } finally {
      setEmailSendLoading(false);
    }
  }

  useEffect(()=>{
    setAttendancePercentage(event.participants>0?(event.attended/event.participants)*100:0);
    setEmailPercentage(event.participants>0?(event.emails_sent/event.participants)*100:0);
    setInvitationPercentage(event.participants>0?(event.invitations_generated/event.participants)*100:0);
  },[event.attended,event.participants,event.emails_sent, event.invitations_generated]);

  useEffect(()=>{
    if(emailsNotSent>=5){
      toast.error(`Failed to send emails to ${emailsNotSent} participants and terminating the process.`);
      setEmailSendLoading(false);
    }
  },[emailsNotSent]);

  useEffect(()=>{
    if(emailPercentage>=100){
      if(emailSendLoading)
      toast.success(`Emails sent to all participants`);
      setEmailSendLoading(false);
    }
  },[emailPercentage]);

  async function handleInvitationGeneration(eventId: string) {
    console.log("Generating invitations");
    setInvitationGenerateLoading(true);

    try {
      const response = await fetch("/api/generate-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_id: eventId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream complete");
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Split by newlines to handle multiple SSE messages in one chunk
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              // Handle different status types
              switch (data.status) {
                case "started":
                  console.log(
                    `Started processing ${data.total} users for ${data.eventTitle}`
                  );
                  break;

                case "batch_started":
                  console.log(
                    `Batch ${data.batch}/${data.totalBatches} started (${data.batchSize} users)`
                  );
                  break;

                case "batch_complete":
                  console.log(
                    `Batch ${data.batch}/${data.totalBatches} complete:`,
                    {
                      successful: data.batchSuccessful,
                      failed: data.batchFailed,
                      progress: `${data.totalProcessed}/${data.total}`,
                    }
                  );
                  dispatch(increaseInvitationsGenerated({_id:event._id,increase:data.batchSuccessful}));
                  break;

                case "complete":
                  console.log("All invitations processed:", {
                    total: data.total,
                    successful: data.successful,
                    failed: data.failed,
                  });

                  if (data.errors && data.errors.length > 0) {
                    console.error("Errors occurred:", data.errors);
                    // Optionally show error notification to user
                    toast.error(
                      `Invitation generation completed with ${data.errors.length} errors. Check console for details.`
                    );
                  } else {
                    // Success notification
                    toast.success(
                      `All ${data.successful} invitations sent successfully!`
                    );
                  }
                  break;

                case "error":
                  console.error("Server error:", data.message);
                  toast.error(`Error generating invitations: ${data.message}`);
                  break;

                default:
                  console.log("Unknown status:", data);
              }
            } catch (e) {
              console.error("Error parsing SSE message:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating invitations:", error);
      toast.error("Failed to generate invitations. Please try again.");
    } finally {
      setInvitationGenerateLoading(false);
    }
  }
  
  const dispatch=useDispatch();
  return (
    <Card className="max-w-lg mt-4 shadow-lg hover:shadow-2xl transition-shadow">
      <div className="flex justify-between gap-3 items-center mb-1">
        <h5 className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
          <FiCheckCircle className="mr-2 text-green-600" /> <Link href={`/admin/${event._id}`}>{event.title}</Link>
        </h5>
        <span className={`px-3 py-1 rounded-full text-xs ${event.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {event.status}
        </span>
      </div>

      <p className="font-normal text-gray-700 mb-1">{event.description}</p>

      <div className="flex items-center gap-1 mb-1">
        <FaCalendarCheck className="mr-2 text-lg text-green-500" /> <span className="text-sm">{formattedDate}</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <FaLocationDot className="mr-2 text-lg text-red-600"/> <span className="text-sm">{event.location}</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <FaClock className="mr-2 text-lg text-orange-400"/> <span className="text-sm">{date.getHours()+":"+date.getMinutes()}</span>
      </div>

      {event.participants > 0 && (
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            <FiUser className="mr-2" /> Attendance:
          </span>
          <Progress color="green" progress={attendancePercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {attendancePercentage}% ({event.attended}/{event.participants})
          </div>
          <span className="text-sm font-medium text-gray-700 flex items-center mt-2">
            <FaFilePdf className="mr-2" /> Invitations Generated:
          </span>
          <Progress color="purple" progress={invitationPercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {invitationPercentage}% ({event.invitations_generated}/{event.participants})
          </div>
          <span className="text-sm font-medium text-gray-700 flex items-center mt-2">
            <FaMailBulk className="mr-2" /> Emails Sent:
          </span>
          <Progress color="blue" progress={emailPercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {emailPercentage}% ({event.emails_sent}/{event.participants})
          </div>
          <Button type="button" isProcessing={emailSendLoading} disabled={emailPercentage>=100} size="xs" className="mt-2" outline fullSized gradientDuoTone="purpleToPink" pill onClick={async ()=>await handleSendingEmail(event._id)}>send email</Button>
        </div>
      )}

      <div className="flex justify-evenly gap-2 mt-2">
        <Button color="yellow" onClick={() => onEdit(event._id)}>
          <FiEdit className="mr-2 text-lg" /> Edit Event
        </Button>
        <Button color="purple" onClick={()=>{dispatch(setFileUploadModalStatus(true)); dispatch(setFileUploadModalEventID(event._id))}}>
          <FiUpload className="mr-2 text-lg" /> Upload Data
        </Button>
      </div>
      <Button color="red" className="mt-4 w-full" isProcessing={invitationGenerateLoading} disabled={invitationGenerateLoading} onClick={async ()=>await handleInvitationGeneration(event._id)}>
        <FaFilePdf className="mr-2" />
        Generate Invitations
      </Button>
    </Card>
  );
}
