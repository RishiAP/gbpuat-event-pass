import { Card, Progress, Button } from 'flowbite-react';
import { FiEdit, FiUpload } from 'react-icons/fi';
import { FaCalendarCheck, FaClock, FaMailBulk, FaUser } from 'react-icons/fa';
import AppBar from '@/components/AppBar';
import Link from 'next/link';
import React from 'react';
import UNIEvents from '@/types/Event';
import { Event } from '@/models/Event';
import { FaLocationDot } from 'react-icons/fa6';

const VerifierPage = async () => {
  const events: UNIEvents[] = await Event.find({ status: 'active' });

  return (
    <>
      <AppBar />
      <div className="container mx-auto mt-5">
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
              <Card key={event._id} className="max-w-md shadow-lg hover:shadow-2xl transition-shadow flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <FiEdit className="mr-2 text-yellow-500" /> {event.title}
                  </h5>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      event.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-400 mb-3">{event.description}</p>

                <div className="flex items-center gap-2 mb-1 text-sm">
                  <FaCalendarCheck className="text-green-500" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-2 mb-1 text-sm">
                  <FaLocationDot className="text-red-600" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 mb-1 text-sm">
                  <FaClock className="text-orange-400" />
                  <span>{date.getHours()}:{date.getMinutes()}</span>
                </div>

                {event.participants > 0 && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center">
                      <FaUser className="mr-2" /> Attendance:
                    </span>
                    <Progress color="green" progress={attendancePercentage} className="mt-1" />
                    <div className="text-xs text-gray-500 mt-1">
                      {attendancePercentage.toFixed(2)}% ({event.attended}/{event.participants})
                    </div>

                    <span className="text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center mt-2">
                      <FaMailBulk className="mr-2" /> Emails Sent:
                    </span>
                    <Progress color="blue" progress={emailPercentage} className="mt-1" />
                    <div className="text-xs text-gray-500 mt-1">
                      {emailPercentage.toFixed(2)}% ({event.emails_sent}/{event.participants})
                    </div>
                  </div>
                )}

                <div className="flex justify-between mt-3 w-full">
                  <Link href={`/verifier/${event._id}`} className='w-full'>
                    <Button color="purple" fullSized>
                      <FiUpload className="mr-2" /> Verify
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default VerifierPage;
