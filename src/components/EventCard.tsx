import { Card, Progress, Button, Label } from "flowbite-react";
import { FiEdit, FiUpload, FiCheckCircle, FiUser } from 'react-icons/fi';
import { FaCalendarCheck } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import Event from "@/types/Event";
import axios from "axios";
import { useRef } from "react";
import { useDispatch } from "react-redux";
import { setFileUploadModalEventID, setFileUploadModalStatus } from "@/store/fileUploadModalSlice";

interface EventCardProps {
    event: Event;
    onEdit: (id: string) => void;
    onUploadData: (id: string) => void;
  }

export function EventCard({ event, onEdit, onUploadData }:EventCardProps) {
  const attendancePercentage =
    event.participants > 0 ? Math.round((event.attended / event.participants) * 100) : 0;
  const fileInputRef=useRef<HTMLInputElement>(null);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  function handleSendingEmail(){
    axios.post('/api/send-verification-emails', {event_id: event._id})
    .then(res=>{
      console.log(res.data);
    })
    .catch(err=>{
      console.error(err);
    });
  }
  
  const dispatch=useDispatch();
  return (
    <Card className="max-w-lg mt-4 shadow-lg hover:shadow-2xl transition-shadow">
      <div className="flex justify-between items-center mb-1">
        <h5 className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
          <FiCheckCircle className="mr-2 text-green-600" /> {event.title}
        </h5>
        <span className={`px-3 py-1 rounded-full text-xs ${event.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {event.status}
        </span>
      </div>

      <p className="font-normal text-gray-700 mb-1">{event.description}</p>

      <div className="flex items-center gap-1 mb-1">
        <FaCalendarCheck className="mr-2 text-lg text-green-500" /> <span className="text-sm mt-1">{formattedDate}</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <FaLocationDot className="mr-2 text-lg text-red-600"/> <span className="text-sm mt-1">{event.location}</span>
      </div>

      {event.participants > 0 && (
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-700 flex items-center">
            <FiUser className="mr-2" /> Attendance:
          </span>
          <Progress color="blue" progress={attendancePercentage} className="mt-1" />
          <div className="text-xs text-gray-500 mt-1">
            {attendancePercentage}% ({event.attended}/{event.participants})
          </div>
          <Button type="button" size="xs" className="mt-2" outline fullSized gradientDuoTone="purpleToPink" pill onClick={handleSendingEmail}>send email</Button>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
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
