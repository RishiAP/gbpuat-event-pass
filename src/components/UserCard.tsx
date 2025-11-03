"use client";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import User from '@/types/User';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserCardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  event_id: string;
  verifying: boolean;
  setVerifying: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserCard: React.FC<UserCardProps> = ({ user, setUser, event_id, verifying, setVerifying }) => {
  const [currentStatus, setCurrentStatus] = useState<boolean>(false);
  
  const formatDateTime = (input: Date | string): string => {
    const date = typeof input === 'string' ? new Date(input) : input;
  
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
  
    return `${day} ${month}, ${year} at ${hours}:${minutes}`;
  };
  
  function verifyUser() {
    setVerifying(true);
    axios.put(`/api/verify`, {
      user_id: user._id,
      event_id: event_id
    }).then(res => {
      if (res.status === 201) {
        toast.success(res.data.message);
        setCurrentStatus(true);
        setUser({
          ...user,
          events: {
            ...user.events,
            [event_id]: {
              ...user.events[event_id],
              entry_time: res.data.time
            }
          }
        });
      } else {
        toast.error(res.data.message || "An error occurred");
      }
    }).catch(err => {
      toast.error("An error occurred");
      console.log(err);
    }).finally(() => {
      setVerifying(false);
    });
  }

  return (
    <Card className="max-w-sm bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300 w-full">
      <CardContent className="pt-3">
        <div className="flex flex-col w-full">
          <div className="w-48 h-auto mb-4 flex justify-center w-full text-center mx-auto">
            <Image
              src={user.photo != null ? user.photo : "https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"}
              alt={`${user.name}'s profile photo`}
              width={192}
              height={192}
              className="w-48 h-auto rounded-lg"
            />
          </div>
          
          <h3 className="text-xl font-semibold text-center">{user.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center">{user.email}</p>
          
          {user.college_id && (
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 w-2/5">College ID</span>
              <span>:</span>
              <span className="w-3/5 ms-3">{user.college_id}</span>
            </div>
          )}
          
          {user.hostel && (
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 w-2/5">Hostel</span>
              <span>:</span>
              <span className="w-3/5 ms-3">{user.hostel.name}</span>
            </div>
          )}
          
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 dark:text-gray-400 w-2/5">Aadhar</span>
            <span>:</span>
            <span className="w-3/5 ms-3">{user.aadhar}</span>
          </div>
          
          {user.college && (
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 w-2/5">College</span>
              <span>:</span>
              <span className="w-3/5 ms-3">{user.college.name}</span>
            </div>
          )}
          
          {user.department && (
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 w-2/5">Department</span>
              <span>:</span>
              <span className="w-3/5 ms-3">{user.department.name}</span>
            </div>
          )}
          
          {user.designation && (
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 w-2/5">Designation</span>
              <span>:</span>
              <span className="w-3/5 ms-3">{user.designation}</span>
            </div>
          )}
          
          {user.events[event_id] && (
            <>
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 w-2/5">Main Gate</span>
                <span>:</span>
                <span className={`w-3/5 ms-3 ${user.same_gate ? "text-green-500" : "text-blue-600"}`}>
                  <strong>{user.events[event_id]?.verifier.name}</strong>
                </span>
              </div>
              
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 w-2/5">Entry Gate</span>
                <span>:</span>
                <span className="w-3/5 ms-3">{user.events[event_id].entry_gate}</span>
              </div>
              
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 w-2/5">Enclosure No.</span>
                <span>:</span>
                <span className="w-3/5 ms-3">{user.events[event_id].enclosure_no}</span>
              </div>
              
              <div className="mt-2 flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 w-2/5">Status</span>
                <span>:</span>
                <span className={`w-3/5 ms-3 ${
                  !user.events[event_id].status
                    ? !user.same_gate
                      ? "text-red-600"
                      : currentStatus
                      ? "text-green-500"
                      : "text-blue-500"
                    : "text-red-600"
                }`}>
                  {!user.events[event_id].status
                    ? !user.same_gate
                      ? <span>Belongs to gate <strong>{user.events[event_id]?.verifier.name}</strong></span>
                      : currentStatus
                      ? "Verified"
                      : "Not verified"
                    : "Already Verified"}
                </span>
              </div>
              
              {user.events[event_id].entry_time && (
                <div className="mt-2 flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 w-2/5">Time of Entry</span>
                  <span>:</span>
                  <span className="w-3/5 ms-3">{formatDateTime(user.events[event_id].entry_time)}</span>
                </div>
              )}
              
              {!user.events[event_id].status && user.same_gate && !currentStatus && (
                <Button
                  className="mt-4 w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600"
                  onClick={verifyUser}
                  disabled={verifying}
                >
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;