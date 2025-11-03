"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import User from "@/types/User";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface UserCardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  event_id: string;
  verifying: boolean;
  setVerifying: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  setUser,
  event_id,
  verifying,
  setVerifying,
}) => {
  const [currentStatus, setCurrentStatus] = useState<boolean>(false);

  const formatDateTime = (input: Date | string): string => {
    const date = typeof input === "string" ? new Date(input) : input;
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const verifyUser = async () => {
    setVerifying(true);
    try {
      const res = await axios.put("/api/verify", {
        user_id: user._id,
        event_id,
      });

      if (res.status === 201) {
        toast.success(res.data.message);
        setCurrentStatus(true);
        setUser({
          ...user,
          events: {
            ...user.events,
            [event_id]: {
              ...user.events[event_id],
              status: true,
              entry_time: res.data.time,
            },
          },
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const event = user.events[event_id];
  const isVerified = event?.status || currentStatus;
  const belongsToThisGate = user.same_gate;
  const canVerify = !isVerified && belongsToThisGate;

  // Status Badge Logic
  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
          <XCircle className="h-2.5 w-2.5 mr-0.5" />
          Already Verified
        </Badge>
      );
    }

    if (!belongsToThisGate) {
      return (
        <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400">
          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
          Belongs to Gate <strong>{event.verifier.name}</strong>
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="h-5 text-[10px] px-1.5 bg-green-500">
        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
        Ready to Verify
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-2 text-center">
        {/* 3:4 Portrait Photo - 144×192 */}
        <div className="flex justify-center mb-1">
          <div className="w-36 h-48 overflow-hidden rounded-sm">
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage
                src={
                  user.photo ||
                  "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"
                }
                alt={user.name}
                className="object-cover w-full h-full"
              />
              <AvatarFallback className="text-3xl bg-muted rounded-none flex items-center justify-center">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name & Email */}
        <div className="mt-1">
          <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {user.college_id && (
            <>
              <span className="text-muted-foreground">College ID</span>
              <span className="font-medium wrap-break-words">{user.college_id}</span>
            </>
          )}
          {user.aadhar && (
            <>
              <span className="text-muted-foreground">Aadhar</span>
              <span className="font-mono tabular-nums wrap-break-words">{user.aadhar}</span>
            </>
          )}
          {user.hostel && (
            <>
              <span className="text-muted-foreground">Hostel</span>
              <span className="font-medium wrap-break-words">{user.hostel.name}</span>
            </>
          )}
          {user.college && (
            <>
              <span className="text-muted-foreground">College</span>
              <span className="font-medium wrap-break-words">{user.college.name}</span>
            </>
          )}
          {user.department && (
            <>
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium wrap-break-words">{user.department.name}</span>
            </>
          )}
          {user.designation && (
            <>
              <span className="text-muted-foreground">Designation</span>
              <span className="font-medium wrap-break-words">{user.designation}</span>
            </>
          )}
        </div>

        {event && (
          <>
            <Separator className="my-1.5" />

            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Main Gate</span>
              <span className="font-medium wrap-break-words">{event.verifier.name}</span>

              <span className="text-muted-foreground">Entry Gate</span>
              <span className="font-medium wrap-break-words">{event.entry_gate}</span>

              <span className="text-muted-foreground">Enclosure No.</span>
              <span className="font-medium wrap-break-words">{event.enclosure_no}</span>

              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center justify-center gap-1">{getStatusBadge()}</div>
            </div>

            {event.entry_time && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Verified: {formatDateTime(event.entry_time)}
              </p>
            )}
          </>
        )}

        {/* Verify Button */}
        {canVerify && (
          <Button
            onClick={verifyUser}
            disabled={verifying}
            className="w-full mt-2 bg-green-500 hover:bg-green-600"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Verify Entry
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UserCard;