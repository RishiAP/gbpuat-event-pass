'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black p-4 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold">{payload[0].payload.name}</p>
        <p className="text-sm">Registrations: <span className="font-medium">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};
import { Download } from 'lucide-react';
import Event from '@/types/Event';
import { useSelector } from 'react-redux';

type AnalyticsData = {
  totalRegistrations: number;
  verifiedCount: number;
  attendedCount: number;
  attendancePercentage: number;
  registrationTrends: { name: string; value: number }[];
  attendanceTrends: { name: string; value: number }[];
};

export const AnalyticsTab = () => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const events: Event[] = useSelector((state: any) => state.events.value);

  const fetchAnalytics = async (eventId: string) => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // You might want to add toast notification here
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    
    try {
      const response = await fetch(`/api/admin/analytics/${selectedEventId}/export`);
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${selectedEventId}-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      // You might want to add toast notification here
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchAnalytics(selectedEventId);
    } else {
      setAnalytics(null);
    }
  }, [selectedEventId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-semibold">Event Analytics</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event._id} value={event._id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleExportCSV} 
            disabled={!selectedEventId || loading}
            variant="outline"
            className="whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRegistrations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.verifiedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.attendedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.attendancePercentage}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Registration by Hostel</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.registrationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={270}
                      textAnchor="end"
                      height={60}
                      interval={0}
                      tickFormatter={(value: string) => {
                        const limit = 5;
                        return value.length > limit ? value.slice(0, limit) + "..." : value;
                      }}
                    />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Registrations" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance by Hostel</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.attendanceTrends}>
                    <br />
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={270}
                      textAnchor="end"
                      height={60}
                      interval={0}
                      tickFormatter={(value: string) => {
                        const limit = 5;
                        return value.length > limit ? value.slice(0, limit) + "..." : value;
                      }}
                    />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Attendees" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">Select an event to view analytics</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
