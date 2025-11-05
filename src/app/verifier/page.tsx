import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Upload, Calendar, Clock, Mail, User, MapPin } from 'lucide-react';
import AppBar from '@/components/AppBar';
import Link from 'next/link';
import React from 'react';
import UNIEvents from '@/types/Event';
import { Event } from '@/models/Event';
import { connect } from '@/config/database/mongoDBConfig';
import FrontEndDate from '@/components/FrontEndDate';

connect();

const VerifierPage = async () => {
  const events: UNIEvents[] = await Event.find({ status: 'active' }).sort({ date: -1 });

  return (
    <>
      <AppBar />
      <div className="container mx-auto mt-5 px-4">
        <div className="flex flex-wrap justify-start gap-5">
          {events.map((event) => {
            const attendancePercentage =
              event.participants > 0 ? (event.attended / event.participants) * 100 : 0;
            const emailPercentage =
              event.participants > 0 ? (event.emails_sent / event.participants) * 100 : 0;
            const date = new Date(event.date);
            const formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <Card key={event._id} className="max-w-md shadow-lg hover:shadow-2xl transition-shadow flex-1 min-w-[320px]">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Edit className="text-yellow-500 flex-shrink-0" size={20} />
                      <span>{event.title}</span>
                    </CardTitle>
                    <Badge
                      variant={event.status === 'active' ? 'default' : 'destructive'}
                      className="flex-shrink-0"
                    >
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-muted-foreground">{event.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-green-500 flex-shrink-0" size={16} />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="text-red-600 flex-shrink-0" size={16} />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="text-orange-400 flex-shrink-0" size={16} />
                      <span>
                        <FrontEndDate date={date} />
                      </span>
                    </div>
                  </div>

                  {event.participants > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <User className="text-muted-foreground" size={16} />
                          Attendance:
                        </span>
                        <Progress value={attendancePercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {attendancePercentage.toFixed(2)}% ({event.attended}/{event.participants})
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Mail className="text-muted-foreground" size={16} />
                          Emails Sent:
                        </span>
                        <Progress value={emailPercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {emailPercentage.toFixed(2)}% ({event.emails_sent}/{event.participants})
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3">
                    <Link href={`/verifier/${event._id}`} className="w-full block">
                      <Button className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Verify
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default VerifierPage;