import { Card, Progress, Button, Label } from "flowbite-react";
import { FiEdit, FiUpload, FiCheckCircle, FiUser } from 'react-icons/fi';
import { FaCalendarCheck, FaMailBulk } from "react-icons/fa";
import { FaClock, FaLocationDot } from "react-icons/fa6";
import Event from "@/types/Event";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setFileUploadModalEventID, setFileUploadModalStatus } from "@/store/fileUploadModalSlice";
import { increaseEmailsSent, setEvents } from "@/store/eventsSlice";
import { toast } from "react-toastify";

interface EventCardProps {
    event: Event;
    onEdit: (id: string) => void;
    onUploadData: (id: string) => void;
  }

export function EventCard({ event, onEdit, onUploadData }:EventCardProps) {
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [emailPercentage, setEmailPercentage] = useState<number>(0);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const [emailsNotSent, setEmailsNotSent] = useState<number>(0);
  const [emailSendLoading, setEmailSendLoading] = useState<boolean>(false);
  const date=new Date(event.date);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleSendingEmail(){
    console.log('Sending email');
    setEmailSendLoading(true);
    axios.post('/api/send-verification-emails', {event_id: event._id})
    .then(res=>{
      console.log(res.data);
      dispatch(increaseEmailsSent({_id:event._id,increase:res.data.successfulEmails.length}));
      if(emailsNotSent+res.data.failedEmails.length<5 && res.data.successfulEmails.length>0){
        handleSendingEmail();
      }
      if(res.data.failedEmails.length>0){
        toast.error(`Failed to send emails to ${res.data.failedEmails.length} participants`);
      }
      setEmailsNotSent(emailsNotSent+res.data.failedEmails.length);
    })
    .catch(err=>{
      console.error(err);
    });
  }

  useEffect(()=>{
    setAttendancePercentage(event.participants>0?(event.attended/event.participants)*100:0);
    setEmailPercentage(event.participants>0?(event.emails_sent/event.participants)*100:0);
  },[event.attended,event.participants,event.emails_sent]);

  useEffect(()=>{
    if(emailsNotSent>=5){
      toast.error(`Failed to send emails to ${emailsNotSent} participants and terminating the process.`);
      setEmailSendLoading(false);
    }
  },[emailsNotSent]);

  useEffect(()=>{
    if(emailPercentage>=100){
      if(emailSendLoading)
      toast.success(`Emails sent to all participants`);
      setEmailSendLoading(false);
    }
  },[emailPercentage]);
  
  const dispatch=useDispatch();
  return (
    <Card className="max-w-lg mt-4 shadow-lg hover:shadow-2xl transition-shadow">
      <div className="flex justify-between gap-3 items-center mb-1">
        <h5 className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
          <FiCheckCircle className="mr-2 text-green-600" /> {event.title}
        </h5>
        <span className={`px-3 py-1 rounded-full text-xs ${event.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {event.status}
        </span>
      </div>

      <p className="font-normal text-gray-700 mb-1">{event.description}</p>

      <div className="flex items-center gap-1 mb-1">
        <FaCalendarCheck className="mr-2 text-lg text-green-500" /> <span className="text-sm">{formattedDate}</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <FaLocationDot className="mr-2 text-lg text-red-600"/> <span className="text-sm">{event.location}</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <FaClock className="mr-2 text-lg text-orange-400"/> <span className="text-sm">{date.getHours()+":"+date.getMinutes()}</span>
      </div>

      {event.participants > 0 && (
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            <FiUser className="mr-2" /> Attendance:
          </span>
          <Progress color="green" progress={attendancePercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {attendancePercentage}% ({event.attended}/{event.participants})
          </div>
          <span className="text-sm font-medium text-gray-700 flex items-center mt-2">
            <FaMailBulk className="mr-2" /> Emails Sent:
          </span>
          <Progress color="blue" progress={emailPercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {emailPercentage}% ({event.emails_sent}/{event.participants})
          </div>
          <Button type="button" isProcessing={emailSendLoading} disabled={emailPercentage>=100} size="xs" className="mt-2" outline fullSized gradientDuoTone="purpleToPink" pill onClick={handleSendingEmail}>send email</Button>
        </div>
      )}

      <div className="flex justify-evenly gap-2 mt-2">
        <Button color="yellow" onClick={() => onEdit(event._id)}>
          <FiEdit className="mr-2 text-lg" /> Edit Event
        </Button>
        <Button color="purple" onClick={()=>{dispatch(setFileUploadModalStatus(true)); dispatch(setFileUploadModalEventID(event._id))}}>
          <FiUpload className="mr-2 text-lg" /> Upload Data
        </Button>
      </div>
    </Card>
  );
}
