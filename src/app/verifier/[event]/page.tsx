"use client";
import AppBar from '@/components/AppBar';
import QRCodeScanner from '@/components/QRScanner';
import axios from 'axios';
import React, { use, useEffect, useState } from 'react';
import User from '@/types/User';
import VerifyingUserSkeleton from '@/components/VerifyingUserSkeleton';
import UserCard from '@/components/UserCard';
import Event from '@/types/Event';
import { toast } from 'sonner';
import QRSkeleton from '@/components/QRSkeleton';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

const EventVerifyPage = ({ params }: { params: Promise<{ event: string }> }) => {
  const paramsResolved = use(params);
  const [qrData, setQRData] = useState<null | string>(null);
  const [isScannerActive, setIsScannerActive] = useState<null | boolean>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<null | User>(null);
  const [event, setEvent] = useState<null | Event>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    axios
      .get('/api/event?_id=' + paramsResolved.event)
      .then((res) => {
        setEvent(res.data);
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setIsScannerActive(true));
  }, [paramsResolved.event]);

  useEffect(() => {
    if (qrData === null) return;
    setIsLoading(true);
    setUser(null);
    axios
      .post("/api/verify", { qrData, event: paramsResolved.event })
      .then((response) => {
        console.log(response);
        setUser({ ...response.data.user, same_gate: response.data.same_gate, repeated: false });
      })
      .catch((error) => {
        if (error.response?.status === 409) {
          setUser({ ...error.response.data.user, same_gate: error.response.data.same_gate, repeated: true });
        } else {
          toast.error(error.response?.data?.message || "An error occurred");
        }
        console.log(error);
      })
      .finally(() => setIsLoading(false));
  }, [qrData, paramsResolved.event]);

  const handleRescan = () => {
    setIsScannerActive(true);
    setQRData(null);
  };

  return (
    <>
      <AppBar />
      <h1 className="text-center text-2xl font-semibold mt-2">{event && event.title}</h1>
      {isScannerActive == null ? (
        <QRSkeleton />
      ) : (
        <div className="w-full max-w-2xl m-auto px-4">
          {isScannerActive ? (
            <QRCodeScanner
              onScanSuccess={(decodedText) => {
                setQRData(decodedText);
                setIsScannerActive(false);
              }}
            />
          ) : (
            <div className="flex flex-col items-center">
              {isLoading ? (
                <VerifyingUserSkeleton />
              ) : user ? (
                <UserCard
                  user={user}
                  setUser={setUser}
                  event_id={paramsResolved.event}
                  verifying={verifying}
                  setVerifying={setVerifying}
                />
              ) : null}
              <Button
                onClick={handleRescan}
                disabled={verifying}
                className="mt-4"
                size="lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Rescan
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default EventVerifyPage;