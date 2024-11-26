"use client";
import { Button, Card } from 'flowbite-react';
import Image from 'next/image'; // Assuming you're using next/image for better image optimization
import User from '@/types/User'; // Adjust the path according to your project
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { set } from 'mongoose';

interface UserCardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User|null>>;
  event_id:string,
  verifying:boolean,
  setVerifying:React.Dispatch<React.SetStateAction<boolean>>;
}

const UserCard: React.FC<UserCardProps> = ({ user,setUser,event_id,verifying,setVerifying }) => {
  const [currentStatus,setCurrentStatus]=useState<boolean>(false);
  
  const formatDateTime = (input: Date | string): string => {
    // Ensure the input is a Date object
    const date = typeof input === 'string' ? new Date(input) : input;
  
    // Handle invalid date cases
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
  
    const day = date.getDate().toString().padStart(2, '0'); // Ensures two digits
    const month = date.toLocaleString('default', { month: 'short' }); // Jan, Feb, etc.
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0'); // 14
    const minutes = date.getMinutes().toString().padStart(2, '0'); // 50
  
    return `${day} ${month}, ${year} at ${hours}:${minutes}`;
  };
  
  function verifyUser(){
    setVerifying(true);
    // Add your verification logic here
    axios.put(`/api/verify`,{
      user_id:user._id,
      event_id:event_id
    }).then(res=>{
      if(res.status===201){
        toast.success(res.data.message,{theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'});
        setCurrentStatus(true);
        setUser({...user,events:{...user.events,[event_id]:{...user.events[event_id],entry_time:new Date()}}});
      }
      else{
        toast.error(res.data.message || "An error occurred",{theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'});
      }
    }).catch(err=>{
      toast.error("An error occurred",{theme:document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'});
      console.log(err);
    })
    .finally(()=>{
      setVerifying(false);
    });
  }
  return (
    <Card className="max-w-sm bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 w-full">
      <div className="flex flex-col w-full">
        <div className="w-48 h-auto mb-4 flex justify-center w-full text-center">
          <Image
            src={user.photo!=null?user.photo:"https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png"}
            alt={`${user.name}'s profile photo`}
            width={192}
            height={192}
            className="w-48 h-auto"
          />
        </div>
        <h3 className="text-xl font-semibold text-center">{user.name}</h3>
        <p className="text-gray-500 text-center">{user.email}</p>
        {user.college_id &&
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">College ID</span><span>:</span> <span className="w-3/5 ms-3">{user.college_id}</span>
          </div>
        }
        {user.hostel &&
          <div className="mt-2 flex justify-between">
          <span className="text-gray-600 w-2/5">Hostel</span><span>:</span> <span className="w-3/5 ms-3">{user.hostel.name}</span>
        </div>
        }
        <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">Aadhar</span><span>:</span> <span className="w-3/5 ms-3">{user.aadhar}</span>
          </div>
        {user.college && 
          (<div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">College</span><span>:</span> <span className="w-3/5 ms-3">{user.college.name}</span>
          </div>)
        }
        {user.department && (
          <div className="mt-2 flex justify-between">
          <span className="text-gray-600 w-2/5">Department</span><span>:</span> <span className="w-3/5 ms-3">{user.department.name}</span>
        </div>
        )}
        {user.designation && (
          <div className="mt-2 flex justify-between">
          <span className="text-gray-600 w-2/5">Designation</span><span>:</span> <span className="w-3/5 ms-3">{user.designation}</span>
        </div>
        )}
        {
          user.events[event_id]?<>
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">Main Gate</span><span>:</span> <span className={`w-3/5 ms-3 ${user.same_gate?"text-green-500":"text-blue-600"}`}><strong>{user.events[event_id]?.verifier.name}</strong></span>
            </div>
            <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">Entry Gate</span><span>:</span> <span className="w-3/5 ms-3">{user.events[event_id].entry_gate}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">Enclosure No.</span><span>:</span> <span className="w-3/5 ms-3">{user.events[event_id].enclosure_no}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-gray-600 w-2/5">Status</span><span>:</span> <span className={`w-3/5 ms-3 ${!user.events[event_id].status?!user.same_gate?"text-red-600":currentStatus?"text-green-500":"text-blue-500":"text-red-600"}`}>{!user.events[event_id].status?!user.same_gate?<span>Belongs to gate <strong>{user.events[event_id]?.verifier.name}</strong></span>:currentStatus?"Verified":"Not verified" :"Already Verified"}</span>
          </div>
          {
            user.events[event_id].entry_time &&
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600 w-2/5">Time of Entry</span><span>:</span> <span className="w-3/5 ms-3">{formatDateTime(user.events[event_id].entry_time)}</span>
            </div>
          }
          {
            !user.events[event_id].status && user.same_gate && !currentStatus?<Button gradientDuoTone="greenToBlue" className="mt-2" isProcessing={verifying} onClick={verifyUser} >{verifying?"Verifying...":"Verify"}</Button>:null
          }
          </>:null
        }
      </div>
    </Card>
  );
};

export default UserCard;
