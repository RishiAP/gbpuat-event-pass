"use client";
import { setEvents } from '@/store/eventsSlice';
import { setVerifiers } from '@/store/verifiersSlice';
import Event from '@/types/Event';
import Verifier from '@/types/Verifier';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EventModal } from './CreateEventModal';
import { EventCard } from './EventCard';
import { Calendar, UserCheck, BarChart2 } from "lucide-react";
import { VerifierCard } from './VerifierCard';
import { VerifierModal } from './CreateVerifierModal';
import { FileUploadModal } from './FileUploadModal';
import { toast } from 'sonner';
import { AnalyticsTab } from './analytics/AnalyticsTab';

// Custom Skeleton Component using shadcn
const CustomSkeleton = () => {
  return (
    <div role="status" className="max-w-sm w-full min-w-72 m-4 p-2">
      <Skeleton className="h-2.5 w-48 mb-4 rounded-full" />
      <Skeleton className="h-2 max-w-[360px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 w-full mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[330px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[330px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[330px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[300px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[360px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[360px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[360px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[300px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[300px] mb-2.5 rounded-full" />
      <Skeleton className="h-2 max-w-[360px] rounded-full" />
      <span className="sr-only">Loading...</span>
    </div>
  );
};

const AdminPage = (props: { events: Event[], verifiers: Verifier[] }) => {
  const events: Event[] = useSelector((state: any) => state.events.value);
  const verifiers: Verifier[] = useSelector((state: any) => state.verifiers.value);
  const [verifierModalOpen, setVerifierModalOpen] = useState(false);
  const [verifier, setVerifier] = useState<Verifier | undefined>(undefined);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);
  const [skeleton, setSkeleton] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setEvents(props.events));
    dispatch(setVerifiers(props.verifiers));
    setSkeleton(false);
  }, [props.events, props.verifiers, dispatch]);

  return (
    <>
      <Tabs defaultValue="events" className="max-w-7xl w-full m-auto p-3">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="verifiers" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Verifiers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <div className="flex flex-col m-auto justify-center w-full">
            <h1 className="text-center text-2xl font-semibold mb-6">Manage Events</h1>
            <div className="flex gap-4 flex-wrap justify-center">
              {skeleton ? (
                <div className="flex justify-evenly flex-wrap gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CustomSkeleton key={i} />
                  ))}
                </div>
              ) : null}
              {events.map((event: Event) => (
                <EventCard
                  event={event}
                  key={event._id}
                  onEdit={(id: string) => {
                    const eventToEdit = events.find((e: Event) => e._id === id);
                    if (eventToEdit) {
                      setSelectedEvent(eventToEdit);
                      setEventModalOpen(true);
                    }
                  }}
                />
              ))}
            </div>
            <Button
              className="mt-4"
              size="lg"
              onClick={() => {
                setEventModalOpen(true);
                setSelectedEvent(undefined);
              }}
            >
              Add Event
            </Button>
            <FileUploadModal />
            <EventModal
              isOpen={eventModalOpen}
              onClose={() => {
                setEventModalOpen(false);
                setSelectedEvent(undefined);
              }}
              event={selectedEvent}
              onEventUpdated={(updatedEvent: Event) => {
                dispatch(
                  setEvents(
                    events.map((e: Event) =>
                      e._id === updatedEvent._id ? updatedEvent : e
                    )
                  )
                );
                setEventModalOpen(false);
                setSelectedEvent(undefined);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="verifiers">
          <div className="flex flex-col m-auto justify-center w-full">
            <h1 className="text-center text-2xl font-semibold mb-6">Manage Verifiers</h1>
            <div className="flex gap-4 flex-wrap justify-center">
              {skeleton ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CustomSkeleton key={i} />
                  ))}
                </>
              ) : (
                verifiers.map((verifier: Verifier) => (
                  <VerifierCard
                    key={verifier._id}
                    verifier={verifier}
                    onEdit={() => {
                      setVerifierModalOpen(true);
                      setVerifier(verifier);
                    }}
                  />
                ))
              )}
            </div>
            <Button
              className="mt-6 w-full max-w-md mx-auto"
              size="lg"
              onClick={() => {
                setVerifierModalOpen(true);
                setVerifier(undefined);
              }}
            >
              Add Verifier
            </Button>
            <VerifierModal
              isOpen={verifierModalOpen}
              onClose={() => {
                setVerifierModalOpen(false);
                setVerifier(undefined);
              }}
              verifier={verifier}
              onVerifierUpdated={(updatedVerifier: Verifier) => {
                dispatch(
                  setVerifiers(
                    verifiers.map((v: Verifier) =>
                      v._id === updatedVerifier._id ? updatedVerifier : v
                    )
                  )
                );
                setVerifierModalOpen(false);
                setVerifier(undefined);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="p-4">
            <AnalyticsTab />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default AdminPage;