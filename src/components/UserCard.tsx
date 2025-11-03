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

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3 text-center">
        {/* Big Rectangular Photo */}
        <div className="flex justify-center -mt-16">
          <div className="w-48 h-64 bg-muted/20 border-2 border-dashed border-muted-foreground/30 rounded-none overflow-hidden shadow-xl">
            <Avatar className="h-full w-full rounded-none">
              <AvatarImage
                src={
                  user.photo ||
                  "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"
                }
                alt={user.name}
                className="object-cover w-full h-full"
              />
              <AvatarFallback className="text-4xl bg-muted rounded-none flex items-center justify-center">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name & Email */}
        <div className="mt-6">
          <h3 className="text-2xl font-bold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Personal Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {user.college_id && (
            <>
              <span className="text-muted-foreground">College ID</span>
              <span className="font-medium">{user.college_id}</span>
            </>
          )}
          {user.aadhar && (
            <>
              <span className="text-muted-foreground">Aadhar</span>
              <span className="font-mono">{user.aadhar}</span>
            </>
          )}
          {user.hostel && (
            <>
              <span className="text-muted-foreground">Hostel</span>
              <span className="font-medium">{user.hostel.name}</span>
            </>
          )}
          {user.college && (
            <>
              <span className="text-muted-foreground">College</span>
              <span className="font-medium">{user.college.name}</span>
            </>
          )}
          {user.department && (
            <>
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{user.department.name}</span>
            </>
          )}
          {user.designation && (
            <>
              <span className="text-muted-foreground">Designation</span>
              <span className="font-medium">{user.designation}</span>
            </>
          )}
        </div>

        <Separator />

        {/* Event Info */}
        {event && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="text-muted-foreground">Main Gate</span>
              <span className="font-medium">{event.verifier.name}</span>

              <span className="text-muted-foreground">Entry Gate</span>
              <span className="font-medium">{event.entry_gate}</span>

              <span className="text-muted-foreground">Enclosure No.</span>
              <span className="font-medium">{event.enclosure_no}</span>

              <span className="text-muted-foreground">Status</span>
              <div className="flex items-center gap-1">
                {isVerified ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : belongsToThisGate ? (
                  <Badge variant="secondary">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Ready to Verify
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Belongs to Gate <strong>{event.verifier.name}</strong>
                  </Badge>
                )}
              </div>
            </div>

            {event.entry_time && (
              <div className="text-xs text-muted-foreground">
                Verified at: {formatDateTime(event.entry_time)}
              </div>
            )}
          </div>
        )}

        {/* Subtle Footer */}
        <div className="relative -mx-6 -mb-6 mt-4 bg-muted/50 backdrop-blur-sm rounded-b-xl">
          <div className="px-6 py-3 text-center text-xs text-muted-foreground">
            GBPUAT Event Verification System
          </div>
        </div>

        {/* Verify Button */}
        {canVerify && (
          <Button
            onClick={verifyUser}
            disabled={verifying}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
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