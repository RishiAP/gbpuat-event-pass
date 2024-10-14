"use client";
import { setEvents } from '@/store/eventsSlice';
import { setVerifiers } from '@/store/verifiersSlice';
import Event from '@/types/Event'
import Verifier from '@/types/Verifier'
import { Button } from 'flowbite-react';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { CreateEventModal } from './CreateEventModal';

const AdminPage = (props:{events:Event[],verifiers:Verifier[]}) => {
    const events=useSelector((state:any)=>state.events.value);
    const verifiers=useSelector((state:any)=>state.verifiers.value);
    const dispatch=useDispatch();
    useEffect(()=>{
        dispatch(setEvents(props.events));
        dispatch(setVerifiers(props.verifiers));
    },[])
  return (
    <>
    <div className="flex flex-col m-auto justify-center w-full max-w-7xl">
    <h1 className='text-center text-2xl'>Manage Events</h1>
    <CreateEventModal/>
    </div>
    </>
  )
}

export default AdminPage