"use client";

import { setEvents } from "@/store/eventsSlice";
import Event from "@/types/Event";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const eventSchema = z.object({
  title: z
    .string()
    .min(1, "Event title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(200, "Location must be less than 200 characters"),
  date: z.date(),
  status: z.enum(["active", "inactive"]).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
  event?: Event & { status?: "active" | "inactive" };
  isOpen: boolean;
  onClose: () => void;
  onEventUpdated: (event: Event & { status?: "active" | "inactive" }) => void;
}

const getInitialForm = (): EventFormData => ({
  title: "",
  description: "",
  date: new Date(),
  location: "",
  status: "active",
});

export function EventModal({
  event,
  isOpen,
  onClose,
  onEventUpdated,
}: EventModalProps) {
  const dispatch = useDispatch();
  const events = useSelector((state: any) => state.events.value);
  const isPastEvent = !!event && new Date(event.date) < new Date(new Date().setHours(0, 0, 0, 0));

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: getInitialForm(),
  });

  // Reset form when modal opens / event changes
  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description,
        location: event.location,
        date: new Date(event.date),
        status: event.status || "active",
      });
    } else {
      form.reset(getInitialForm());
    }
  }, [event, isOpen, form]);

  const onSubmit = async (data: EventFormData): Promise<void> => {
    if (!event) {
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      if (data.date < today) {
        form.setError("date", { message: "Event date must be in the future" });
        return;
      }
    }
    const toastId = toast.loading(event ? "Updating event..." : "Adding event...");

    try {
      if (event) {
        const updatePayload = {
          ...data,
          title: event.title,
          description: event.description,
          location: event.location,
          date: isPastEvent ? new Date(event.date) : data.date,
        };
        await axios.put("/api/admin", {
          ...updatePayload,
          type: "event",
          _id: event._id,
        });
        onEventUpdated({ ...event, ...updatePayload });
        toast.dismiss(toastId);
        toast.success("Event updated successfully");
      } else {
        const res = await axios.post("/api/admin", { ...data, type: "event" });
        dispatch(setEvents([...events, res.data]));
        toast.dismiss(toastId);
        toast.success("Event added successfully");
      }

      onClose();
      setTimeout(() => form.reset(getInitialForm()), 300);
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error(err);
      const action = event ? "update" : "add";
      const errorMessage =
        err.response?.data?.error?.code === 11000
          ? "Duplicate event title"
          : err.response?.data?.message ||
            err.response?.data?.error ||
            `Failed to ${action} event`;
      toast.error(errorMessage);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.currentTarget.value.split(":").map(Number);
    const current = form.getValues("date");
    const date = new Date(current);
    date.setHours(h);
    date.setMinutes(m);
    form.setValue("date", date);
  };

  const getTimeZoneAbbreviation = () => {
    const date = form.watch("date");
    return date
      .toLocaleDateString(undefined, { day: "2-digit", timeZoneName: "long" })
      .substring(4)
      .split(" ")
      .map((s) => s[0])
      .join("");
  };

  const handleClose = (open: boolean) => {
    if (!form.formState.isSubmitting && !open) {
      onClose();
      setTimeout(() => form.reset(getInitialForm()), 300);
    }
  };

  return (
    <Dialog open={form.formState.isSubmitting || isOpen} onOpenChange={handleClose}>
      {/* RESPONSIVE DIALOG */}
      <DialogContent className="max-w-full sm:max-w-[525px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Add a new event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update the event details below."
              : "Create a new event by filling in the details below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event title"
                      disabled={form.formState.isSubmitting || !!event}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event description"
                      disabled={form.formState.isSubmitting || !!event}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event location"
                      disabled={form.formState.isSubmitting || !!event}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time – RESPONSIVE ROW */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Calendar Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full sm:w-auto justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={form.formState.isSubmitting || isPastEvent}
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full sm:w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const hours = field.value.getHours();
                                const minutes = field.value.getMinutes();
                                date.setHours(hours);
                                date.setMinutes(minutes);
                                field.onChange(date);
                              }
                            }}
                            disabled={(d) =>
                              (!event && d < new Date(new Date().setHours(0, 0, 0, 0))) || isPastEvent
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Time Input */}
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="time"
                          className="pl-10 w-full"
                          value={`${String(field.value.getHours()).padStart(
                            2,
                            "0"
                          )}:${String(field.value.getMinutes()).padStart(2, "0")}`}
                          onChange={handleTimeChange}
                          disabled={form.formState.isSubmitting || isPastEvent}
                        />
                      </div>

                      {/* Timezone Badge */}
                      <div className="flex items-center px-3 py-2 border rounded-md bg-muted text-sm font-medium whitespace-nowrap">
                        {getTimeZoneAbbreviation()}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Toggle - Show when editing */}
            {event && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Status</FormLabel>
                        <div className={cn(
                          "text-sm font-medium",
                          field.value === "active" 
                            ? "text-green-600 dark:text-green-500" 
                            : "text-red-600 dark:text-red-500"
                        )}>
                          {field.value === "active" ? "Active" : "Inactive"}
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "active"}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "active" : "inactive")
                          }
                          disabled={form.formState.isSubmitting}
                          className={cn(
                            field.value === "active" 
                              ? "data-[state=checked]:bg-green-600" 
                              : ""
                          )}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* RESPONSIVE FOOTER */}
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {form.formState.isSubmitting
                  ? event
                    ? "Updating..."
                    : "Adding..."
                  : event
                  ? "Update Event"
                  : "Add Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}