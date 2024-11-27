"use client";
import React, { useEffect, useState } from 'react';
import { Progress, Card, Spinner } from 'flowbite-react';
import { FaUsers, FaEnvelope, FaCalendarCheck, FaKey, FaUserCheck, FaEye, FaEyeSlash } from 'react-icons/fa';
import Event from '@/types/Event';
import Verifier from '@/types/Verifier';
import axios from 'axios';

interface AdminEventPageProps {
  event: Event;
}

const AdminEventPage: React.FC<AdminEventPageProps> = ({ event }) => {
    const [eventData, setEventData] = useState<Event | null>(event);
    const [attendancePercentage, setAttendancePercentage] = useState<number>(event.participants > 0 ? Math.min((event.attended / event.participants) * 100, 100) : 0);
    const [emailsSentPercentage, setEmailsSentPercentage] = useState<number>(event.participants > 0 ? Math.min((event.emails_sent / event.participants) * 100, 100) : 0);
    useEffect(() => {
        setAttendancePercentage(event.participants > 0 ? Math.min((event.attended / event.participants) * 100, 100) : 0);
        setEmailsSentPercentage(event.participants > 0 ? Math.min((event.emails_sent / event.participants) * 100, 100) : 0);
    },[event]);
  
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const liveFetch=async () => {
    try{
        setEventData((await axios.get(`/api/event_updates?_id=${event._id}`)).data);
    }
    catch(err){
        console.error(err);
    }
    setTimeout(liveFetch, 60000);
}

  useEffect(() => {
    setTimeout(liveFetch, 60000);
},[]);

  return (
    eventData==null?<></>:
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">{event.title}</h1>
      <p className="text-lg">{event.description}</p>
      <div className="mt-4 flex items-center space-x-4">
        <div className="flex items-center">
          <FaCalendarCheck className="text-2xl mr-2" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center">
          <FaUsers className="text-2xl mr-2" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center">
          <span className={`text-lg font-bold ${event.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Attendance Progress</h2>
          <Progress progress={attendancePercentage} />
          <div className="flex justify-between mt-2">
            <FaUsers className="text-green-500" />
            <span>{event.attended} / {event.participants} Attended {eventData.participants > 0 ? `(${attendancePercentage} %)` : ""}</span>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">Emails Sent Progress</h2>
          <Progress progress={emailsSentPercentage} />
          <div className="flex justify-between mt-2">
            <FaEnvelope className="text-blue-500" />
            <span>{eventData.emails_sent} / {eventData.participants} Emails Sent {eventData.participants > 0 ? `(${emailsSentPercentage} %)` : ""}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Verifiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventData.verifiers.map((verifier) => (
            <Card key={verifier.verifier._id} className="max-w-sm min-w-72 mt-4 shadow-lg hover:shadow-2xl transition-shadow">
              <VerifierInfo verifier={verifier.verifier} attended={verifier.attended} no_of_users={verifier.no_of_users} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VerifierInfoProps {
  verifier: Verifier;
  no_of_users: number;
  attended: number;
}

const VerifierInfo: React.FC<VerifierInfoProps> = ({ verifier,no_of_users,attended }) => {

  // Dummy attendance data for each verifier
  const attendancePercentage = no_of_users>0?attended/no_of_users*100:0;

  return (
    <div>
      <div className="flex justify-between items-center">
        <h5 className="text-lg font-bold tracking-tight text-gray-900 flex items-center">
          <FaUserCheck className="mr-2 text-blue-600" /> {verifier.name}
        </h5>
      </div>
      <div className="mb-2">
        <p className="font-normal text-gray-700 flex gap-2 items-center mb-1">
          <FaUserCheck className="text-green-500" />
          {verifier.username}
        </p>
      </div>
      <div className="mt-4">
        <h3 className="text-md font-semibold">Verifier Attendance</h3>
        <Progress progress={attendancePercentage} color="green" />
        <p className="text-sm mt-1 flex justify-between"><span>{attendancePercentage}% Attendance</span><span>{attended}/{no_of_users}</span></p>
      </div>
    </div>
  );
}

export default AdminEventPage;
