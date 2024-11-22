"use client";
import AppBar from '@/components/AppBar';
import QRCodeScanner from '@/components/QRScanner';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import User from '@/types/User';
import VerifyingUserSkeleton from '@/components/VerifyingUserSkeleton';
import UserCard from '@/components/UserCard';
import Event from '@/types/Event';
import { toast } from 'react-toastify';
import QRSkeleton from '@/components/QRSkeleton';

const EventVerifyPage = ({params}:{params:{event:string}}) => {
  const [qrData, setQRData] = useState<null | string>(null);
  const [isScannerActive, setIsScannerActive] = useState<null|boolean>(null); // To track if scanner is running
  const [isLoading,setIsLoading]=useState(false);
  const [user,setUser]=useState<null|User>(null);
  const [event,setEvent]=useState<null|Event>(null);
  const [verifying, setVerifying] = useState(false);
  useEffect(() => {
    axios.get('/api/event?_id='+params.event)
    .then(res=>{
      setEvent(res.data);
      console.log(res.data);
    })
    .catch(err=>{
      console.error(err);
    }).finally(()=>setIsScannerActive(true));
  },[params.event]);

  useEffect(() => {
    if (qrData === null) return;
    setIsLoading(true);
    setUser(null);
    axios
      .post("/api/verify", { qrData, event: params.event })
      .then((response) => {
        console.log(response);
        setUser({...response.data.user,same_gate:response.data.same_gate,repeated:false});
      })
      .catch((error) => {
        if(error.response.status===409)
          setUser({...error.response.data.user,same_gate:error.response.data.same_gate,repeated:true});
        else
        toast.error(error.response.data.message || "An error occurred",{theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'});
        console.log(error);
      }).finally(()=>setIsLoading(false));
  }, [qrData]);

  const handleRescan = () => {
    setIsScannerActive(true); // Reactivate the scanner
    setQRData(null); // Clear the previous scan data
  };

  return (
    <>
      <AppBar />
      <h1 className='text-center text-2xl'>{event && event.title}</h1>
      {
        isScannerActive==null?<QRSkeleton/>:
      <div className="w-full max-w-2xl m-auto">
        {isScannerActive ? (
          <QRCodeScanner
            onScanSuccess={(decodedText) => {
              setQRData(decodedText);
              setIsScannerActive(false); // Stop the scanner once scan is complete
            }}
          />
        ) : (
          <div className="flex flex-col items-center">
            {
              isLoading?<VerifyingUserSkeleton/>:user?<UserCard user={user} event={params.event} verifying={verifying} setVerifying={setVerifying} />:null
            }
            <button
              onClick={handleRescan}
              className="focus:outline-none text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mt-4 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800" disabled={verifying}
            >
              Rescan
            </button>
          </div>
        )}
      </div>
      }
    </>
  );
};

export default EventVerifyPage;
