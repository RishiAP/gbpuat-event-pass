"use client";

import { headerToObject } from "@/types/extras";
import { setFileUploadModalStatus } from "@/store/fileUploadModalSlice";
import Event from "@/types/Event";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { setEvents } from "@/store/eventsSlice";
import { Loader2 } from "lucide-react";

export function FileUploadModal() {
  const fileUploadModalStatus = useSelector((state: any) => state.fileUploadModal.value.status);
  const fileUploadModalEventID = useSelector((state: any) => state.fileUploadModal.value.event_id);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
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
              setProgress(percentCompleted);
              if (percentCompleted === 100) {
                setIsProcessing(true);
                setIsUploading(false);
              }
            }
          },
        })
        .then((response) => {
          setIsProcessing(true);
          const e: Event[] = events.filter((e: Event) => e._id !== fileUploadModalEventID);
          dispatch(setEvents([...e, response.data.event]));
          dispatch(setFileUploadModalStatus(false));
          toast.success(response.data.message);
        })
        .catch((error) => {
          toast.error(
            error.response?.data?.origin != undefined
              ? error.response.data.origin
              : error.response?.data?.error != ""
              ? error.response?.data?.error
              : "Something went wrong"
          );
        })
        .finally(() => {
          setIsUploading(false);
          setIsProcessing(false);
          setProgress(0);
        });
    } else {
      toast.error("Please select a file");
    }
  }

  function handleClose() {
    if (!isUploading && !isProcessing) {
      dispatch(setFileUploadModalStatus(false));
    }
  }

  return (
    <Dialog open={isUploading || fileUploadModalStatus} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload User Data</DialogTitle>
          <DialogDescription>
            Upload a file containing user data for the selected event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFileUpload}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Event: </strong>
                {events.find((e: Event) => e._id === fileUploadModalEventID)?.title}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".xls, .xlsx, .json, .csv"
                onChange={(e) => {
                  if (e.currentTarget.files != null && e.currentTarget.files.length > 0) {
                    setFile(e.currentTarget.files[0]);
                  }
                }}
                required
                disabled={isUploading || isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Upload a excel (.xls, .xlsx), .json or .csv file. The file should contain fields namely:{" "}
                {Object.keys(headerToObject).map((key, index) => (
                  <span key={key}>
                    <strong>{key}</strong>
                    {index < Object.keys(headerToObject).length - 1 && ", "}
                  </span>
                ))}
                {" "}(Case insensitive)
              </p>
            </div>

            {(isUploading || isProcessing) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isUploading ? "Uploading..." : "Processing Data..."}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading || isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || isProcessing}>
              {(isUploading || isProcessing) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUploading
                ? "Uploading File..."
                : isProcessing
                ? "Processing Data..."
                : "Upload File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}