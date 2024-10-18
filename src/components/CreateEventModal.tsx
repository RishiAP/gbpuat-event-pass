
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
  const [formData, setFormData] = useState<any>(initialForm);

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
            <Datepicker className="event-date" minDate={formData.date} addon={"Date"} value={formData.date} onChange={(e)=>setFormData({...formData,date:e==null?new Date():e})} required />
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
