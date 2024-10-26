
"use client";

import { setEvents } from "@/store/eventsSlice";
import Event from "@/types/Event";
import axios from "axios";
import { Button, Datepicker, FloatingLabel, Modal } from "flowbite-react";
import { FormEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

export function CreateEventModal() {
  const [openModal, setOpenModal] = useState(false);
  const dispatch=useDispatch();
  const [loading,setLoading]=useState(false);
  const events=useSelector((state:any)=>state.events.value);
  const initialForm={
    title: "",
    description: "",
    date: new Date(),
    location: "",
  };
  const [formData, setFormData] = useState<{title:string,description:string,date:Date,location:string}>(initialForm);

  function handleFormSubmit(e:FormEvent) {
    e.preventDefault();
    setLoading(true);
    axios.post("/api/admin", {...formData,type:"event"}).then((res) => {
      console.log(res.data);
      dispatch(setEvents([...events,res.data]));
      setFormData(initialForm);
      setOpenModal(false);
      toast.success("Event added successfully",{theme:document.querySelector('html')?.classList.contains('dark-mode')?'dark':'light'});
    }).catch((err) => {
      console.error(err);
      toast.error(err.response.data.error==""?"Something went wrong":err.response.data.error.code==11000?"Duplicate event title":err.response.data.error,{theme:document.querySelector('html')?.classList.contains('dark')?'dark':'light'});
    }).finally(()=>setLoading(false));
  }

  return (
    <>
      <Button className='mt-4' size='xl' color='purple' onClick={() => setOpenModal(true)}>Add Event</Button>
      <Modal dismissible show={loading || openModal} onClose={() => setOpenModal(false)} id="createEventModal">
        <Modal.Header>Add a new event</Modal.Header>
        <form onSubmit={handleFormSubmit}>
        <Modal.Body>
          <div className="space-y-6">
            <FloatingLabel variant="standard" label="Event Title" value={formData.title} onInput={(e)=>setFormData({...formData,title:e.currentTarget.value})} required />
            <FloatingLabel variant="standard" label="Description" value={formData.description} onInput={(e)=>setFormData({...formData,description:e.currentTarget.value})} required />
            <FloatingLabel variant="standard" label="Location" value={formData.location} onInput={(e)=>setFormData({...formData,location:e.currentTarget.value})} required />
              <div className="flex">
            <Datepicker className="event-date rounded-e-none w-full" minDate={formData.date} value={formData.date} onChange={(e)=>{e?.setMinutes(formData.date.getMinutes()); e?.setHours(formData.date.getHours()); setFormData({...formData,date:e==null?new Date():e})}} required />

            <div className="relative">
                <div className="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                    </svg>
                </div>
                <input type="time" id="time" className="bg-gray-50 h-full rounded-s-none rounded-lg border leading-none border-gray-300 text-gray-900 text-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={(formData.date.getHours()<10?"0":"")+ formData.date.getHours()+":"+(formData.date.getMinutes()<10?"0":"")+formData.date.getMinutes()} onInput={
                    (e)=>{
                        const time=e.currentTarget.value.split(":");
                        const date=formData.date;
                        date.setMinutes(parseInt(time[1]));
                        date.setHours(parseInt(time[0]));
                        setFormData({...formData,date});
                    }
                  } required />
            </div>
            <div className="mt-2 ms-2">
            {
              formData.date.toLocaleDateString(undefined, {day:'2-digit',timeZoneName: 'long' }).substring(4).split(" ").flatMap((item,index)=>item.substring(0,1))
            }
            </div>
          
              </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <Button color="gray" onClick={() => setOpenModal(false)}>
            Cancel
          </Button>
          <Button type="submit" isProcessing={loading} >{loading?"Adding...":"Add Event"}</Button>
        </Modal.Footer>
        </form>
      </Modal>
    </>
  );
}
