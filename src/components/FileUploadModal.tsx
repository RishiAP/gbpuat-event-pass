"use client";

import { headerToObject } from "@/types/extras";
import { setFileUploadModalStatus } from "@/store/fileUploadModalSlice";
import Event from "@/types/Event";
import axios from "axios";
import { Button, FileInput, Modal, Progress } from "flowbite-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { setEvents } from "@/store/eventsSlice";

export function FileUploadModal() {
  const fileUploadModalStatus = useSelector((state: any) => state.fileUploadModal.value.status);
  const fileUploadModalEventID = useSelector((state: any) => state.fileUploadModal.value.event_id);
  const [isUploading, setIsUploading] = useState(false); // Track file upload state
  const [isProcessing, setIsProcessing] = useState(false); // Track data processing state
  const [progress, setProgress] = useState(0); // Progress state
  const dispatch = useDispatch();
  const events: Event[] = useSelector((state: any) => state.events.value);
  const [file, setFile] = useState<File | null>(null);

  function handleFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (file != null) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("event_id", fileUploadModalEventID);

      axios
        .post("/api/upload-user-data", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent && progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(percentCompleted); // Update progress state
              if(percentCompleted === 100) {
                setIsProcessing(true); // Switch to data processing state
                setIsUploading(false);
              }
            }
          },
        })
        .then((response) => {
          setIsProcessing(true); // Switch to data processing state
          const e: Event[] = events.filter((e: Event) => e._id !== fileUploadModalEventID);
          dispatch(setEvents([...e, response.data.event]));
          dispatch(setFileUploadModalStatus(false));
          toast.success(response.data.message, {
            theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light",
          });
        })
        .catch((error) => {
          toast.error(
            error.response.data.origin != undefined
              ? error.response.data.origin
              : error.response.data.error != ""
              ? error.response.data.error
              : "Something went wrong",
            { theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light" }
          );
        })
        .finally(() => {
          setIsUploading(false);
          setIsProcessing(false); // Reset processing state
          setProgress(0); // Reset progress after completion
        });
    } else {
      toast.error("Please select a file", {
        theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light",
      });
    }
  }

  return (
    <>
      <Modal dismissible show={isUploading || fileUploadModalStatus} onClose={() => dispatch(setFileUploadModalStatus(false))}>
        <Modal.Header>Upload User data</Modal.Header>
        <form onSubmit={handleFileUpload}>
          <Modal.Body>
            <div className="space-y-3">
              <p>
                <strong>Event : </strong>
                {events.find((e: Event) => e._id === fileUploadModalEventID)?.title}
              </p>
              <FileInput
                id="file"
                helperText={
                  <>
                    <span>{`Upload a excel(.xls,.xlsx), .json or .csv file. The file should contain fields namely : `}</span>
                    {Object.keys(headerToObject).map((key) => (
                      <span key={key}>
                        <strong>{key}</strong>,{" "}
                      </span>
                    ))}
                    <span>{`(Case insensitive)`}</span>
                  </>
                }
                accept=".xls, .xlsx, .json, .csv"
                onChange={(e) => {
                  if (e.currentTarget.files != null && e.currentTarget.files.length > 0) {
                    setFile(e.currentTarget.files[0]);
                  }
                }}
                required
              />
              {isUploading || isProcessing && (
                <div className="mt-4">
                  {/* Display progress bar */}
                  <Progress progress={progress} textLabel="Uploading..." size="lg" color="indigo" labelProgress labelText />
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-end">
            <Button color="gray" onClick={() => dispatch(setFileUploadModalStatus(false))} disabled={isUploading || isProcessing}>
              Cancel
            </Button>
            <Button isProcessing={isUploading || isProcessing} type="submit" disabled={isUploading || isProcessing}>
              {isUploading
                ? "Uploading File..."
                : isProcessing
                ? "Processing Data..."
                : "Upload File"}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}
