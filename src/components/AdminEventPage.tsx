"use client";
import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Calendar, UserCheck, MapPin } from 'lucide-react';
import Event from '@/types/Event';
import Verifier from '@/types/Verifier';
import axios from 'axios';

interface AdminEventPageProps {
  event: Event;
}

const AdminEventPage: React.FC<AdminEventPageProps> = ({ event }) => {
  const [eventData, setEventData] = useState<Event | null>(event);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(
    event.participants > 0 ? Math.min((event.attended / event.participants) * 100, 100) : 0
  );
  const [emailsSentPercentage, setEmailsSentPercentage] = useState<number>(
    event.participants > 0 ? Math.min((event.emails_sent / event.participants) * 100, 100) : 0
  );

  useEffect(() => {
    setAttendancePercentage(
      event.participants > 0 ? Math.min((event.attended / event.participants) * 100, 100) : 0
    );
    setEmailsSentPercentage(
      event.participants > 0 ? Math.min((event.emails_sent / event.participants) * 100, 100) : 0
    );
  }, [event]);

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const liveFetch = async () => {
    try {
      setEventData((await axios.get(`/api/event_updates?_id=${event._id}`)).data);
    } catch (err) {
      console.error(err);
    }
    setTimeout(liveFetch, 60000);
  };

  useEffect(() => {
    setTimeout(liveFetch, 60000);
  }, []);

  return eventData == null ? (
    <></>
  ) : (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-lg text-muted-foreground">{event.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <span>{event.location}</span>
        </div>
        <Badge 
          variant={event.status === 'active' ? 'default' : 'destructive'}
          className="text-sm"
        >
          {event.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={attendancePercentage} className="h-3" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Attended</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {event.attended} / {event.participants}
                {eventData.participants > 0 && ` (${Math.round(attendancePercentage)}%)`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails Sent Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={emailsSentPercentage} className="h-3" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Sent</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {eventData.emails_sent} / {eventData.participants}
                {eventData.participants > 0 && ` (${Math.round(emailsSentPercentage)}%)`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Verifiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventData.verifiers.map((verifier) => (
            <Card key={verifier.verifier._id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <VerifierInfo
                  verifier={verifier.verifier}
                  attended={verifier.attended}
                  no_of_users={verifier.no_of_users}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

interface VerifierInfoProps {
  verifier: Verifier;
  no_of_users: number;
  attended: number;
}

const VerifierInfo: React.FC<VerifierInfoProps> = ({ verifier, no_of_users, attended }) => {
  const attendancePercentage = no_of_users > 0 ? (attended / no_of_users) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <UserCheck className="text-blue-600" size={20} />
          {verifier.name}
        </h5>
        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
          <UserCheck className="text-green-500" size={16} />
          {verifier.username}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Verifier Attendance</h3>
        <Progress value={attendancePercentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{Math.round(attendancePercentage)}% Attendance</span>
          <span>{attended}/{no_of_users}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminEventPage;