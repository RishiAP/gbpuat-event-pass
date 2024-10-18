"use client";
import { setEvents } from '@/store/eventsSlice';
import { setVerifiers } from '@/store/verifiersSlice';
import Event from '@/types/Event'
import Verifier from '@/types/Verifier'
import { Button } from 'flowbite-react';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { CreateEventModal } from './CreateEventModal';
import { EventCard } from './EventCard';
import { Tabs } from "flowbite-react";
import { HiAdjustments, HiClipboardList, HiUserCircle } from "react-icons/hi";
import { MdDashboard, MdEmojiEvents, MdVerified, MdVerifiedUser } from "react-icons/md";
import { VerifierCard } from './VerifierCard';
import { VerifierModal } from './CreateVerifierModal';
import Skeleton from './Skeleton';
import { FileUploadModal } from './FileUploadModal';

const AdminPage = (props:{events:Event[],verifiers:Verifier[]}) => {
    const events:Event[]=useSelector((state:any)=>state.events.value);
    const verifiers:Verifier[]=useSelector((state:any)=>state.verifiers.value);
    const [verifierModalOpen,setVerifierModalOpen]=useState(false);
    const [skeleton,setSkeleton]=useState(true);
    const dispatch=useDispatch();
    useEffect(()=>{
        dispatch(setEvents(props.events));
        dispatch(setVerifiers(props.verifiers));
        setSkeleton(false);
    },[])
  return (
    <>
      <Tabs aria-label="Tabs with icons" className='max-w-7xl w-full m-auto flex justify-evenly' variant="underline">
      <Tabs.Item active title="Events" icon={MdEmojiEvents}>
        <div className="flex flex-col m-auto justify-center w-full max-w-7xl p-3 pt-0">
        <h1 className='text-center text-2xl'>Manage Events</h1>
        <div className="flex gap-2 flex-wrap justify-center">
          {
            skeleton? <div className="flex justify-evenly flex-wrap">
              {
                Array.from({length:6}).map((_,i)=><Skeleton event={true} key={i} />)
              }
            </div> :null
          }
        {
          events.map((event:Event)=><EventCard event={event} key={event._id} onEdit={(id:string)=>{}} onUploadData={(id:string)=>{}}/>)
        }
        </div>
        <CreateEventModal/>
        <FileUploadModal/>
        </div>
      </Tabs.Item>
      <Tabs.Item title="Verifiers" icon={MdVerifiedUser}>
      <div className="flex flex-col m-auto justify-center w-full max-w-7xl p-3 pt-0">
        <h1 className='text-center text-2xl'>Manage Verifiers</h1>
        <div className="flex gap-2 flex-wrap justify-center">
        {
            skeleton? Array.from({length:6}).map((_,i)=><Skeleton event={false} key={i} />):null
          }
        {
          verifiers.map((verifier:Verifier)=><VerifierCard key={verifier._id} verifier={verifier} onEdit={()=>{}} />)
        }
        <Button className='mt-4 w-full' size='xl' color='purple' onClick={() => setVerifierModalOpen(true)}>Add Verifier</Button>
        </div>
        <VerifierModal isOpen={verifierModalOpen} onClose={()=>setVerifierModalOpen(false)} onVerifierUpdated={()=>{}} />
          </div>
      </Tabs.Item>
    </Tabs>
    </>
  )
}

export default AdminPage