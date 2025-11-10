'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Download, Search, Filter, ExternalLink, FileText, IdCard, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import Event from '@/types/Event';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';

// Column options for both tabs
const FACULTY_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'college', label: 'College' },
  { key: 'main_gate', label: 'Main Gate' },
  { key: 'enclosure', label: 'Enclosure' },
  { key: 'status', label: 'Status' },
  { key: 'documents', label: 'Documents' },
  { key: 'entry', label: 'Entry Details' },
];
const HOSTEL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'college', label: 'College' },
  { key: 'college_id', label: 'College ID' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'main_gate', label: 'Main Gate' },
  { key: 'enclosure', label: 'Enclosure' },
  { key: 'status', label: 'Status' },
  { key: 'entry', label: 'Entry Time' },
];

// Helper for dropdown explanations
const DropdownHelp = ({ text }: { text: string }) => (
  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-1">
    <Info className="h-3 w-3" />
    {text}
  </span>
);

// Helper to get unique colleges/hostels/departments from mapping
// Ensure IDs are strings to avoid ObjectId mismatches between client and server
const getOptions = (arr: any[], key = 'name') =>
  arr.map((item) => ({ value: String(item._id), label: item[key] }));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-4 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold">{payload[0].payload.name}</p>
        <p className="text-sm">Registrations: <span className="font-medium">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

type UserData = {
  _id: string;
  name: string;
  email: string;
  designation: string;
  college_id: number | null;
  photo: string;
  department: { _id: string; name: string } | null;
  college: { _id: string; name: string } | null;
  hostel: { _id: string; name: string } | null;
  eventInfo: {
    status: boolean;
    seat_no: string;
    enclosure_no: string;
    entry_gate: string | null;
    entry_time: Date | null;
    invitation: string | null;
    id_card: string | null;
    hasInvitation: boolean;
    hasIdCard: boolean;
    hasAttended: boolean;
    verifier: { _id: string; name: string; email: string } | null;
  };
};

type AnalyticsData = {
  summary: {
    totalRegistrations: number;
    withInvitation: number;
    withIdCard: number;
    attendedCount: number;
    attendancePercentage: number;
    invitationPercentage: number;
    idCardPercentage: number;
    registrationTrends: { name: string; value: number }[];
    attendanceTrends: { name: string; value: number }[];
  };
  data: UserData[];
  pagination: {
    currentPage: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: any;
};
type EventSummary = {
  totalRegistrations: number;
  withInvitation: number;
  withIdCard: number;
  attendedCount: number;
  attendancePercentage: number;
  invitationPercentage: number;
  idCardPercentage: number;
  faculties?: number;
  students?: number;
};

export const AnalyticsTab = () => {
  // Mapping state
  const [mappings, setMappings] = useState<{ colleges: any[]; hostels: any[]; departments: any[] }>({ colleges: [], hostels: [], departments: [] });
  const [mappingsLoading, setMappingsLoading] = useState(true);
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [hostelFilter, setHostelFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [facultyColumns, setFacultyColumns] = useState(FACULTY_COLUMNS.map(c => c.key));
  const [hostelColumns, setHostelColumns] = useState(HOSTEL_COLUMNS.map(c => c.key));
  // Fetch mappings for selects
  useEffect(() => {
    setMappingsLoading(true);
    fetch('/api/mappings')
      .then(res => res.json())
      .then(data => setMappings(data))
      .catch(err => console.error('Failed to load mappings', err))
      .finally(() => setMappingsLoading(false));
  }, []);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [eventSummary, setEventSummary] = useState<EventSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  // Loading state specifically for graphs/trends (used on tab change when we refetch trends)
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'faculty' | 'hostel'>('faculty');
  const events: Event[] = useSelector((state: any) => state.events.value);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  // Remove invitation filter
  const [idCardFilter, setIdCardFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Scroll container ref for load-on-scroll (keeps header sticky because header is inside the same container)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Faculty/hostel logic: faculty = has college, hostel = has hostel
  const fetchAnalytics = useCallback(async (eventId: string, page: number = 1, append: boolean = false, includeTrends: boolean = true) => {
    if (!eventId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setAllUsers([]);
      // When we're (re)loading trends (e.g., on tab change), show graph skeletons
      if (includeTrends) setTrendsLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      // Include or skip trends for this request
      if (!includeTrends) {
        params.append('includeTrends', 'false');
      }
      if (activeTab === 'faculty') {
        // Faculty: has college, no college_id
        params.append('hasCollege', 'true');
        params.append('noCollegeId', 'true');
        params.append('fields', 'invitation,id_card,entry_time,verifier');
        if (collegeFilter !== 'all') params.append('college', collegeFilter);
        // Only allow department filter if a specific college is selected
        if (collegeFilter !== 'all' && departmentFilter !== 'all') params.append('department', departmentFilter);
      } else {
        // Hostel: has college_id (students)
        params.append('hasCollegeId', 'true');
        if (hostelFilter !== 'all') params.append('hostel', hostelFilter);
        if (collegeFilter !== 'all') {
          params.append('college', collegeFilter);
        }
        if (collegeFilter !== 'all' && departmentFilter !== 'all') {
          params.append('department', departmentFilter);
        }
      }
      if (searchQuery) params.append('search', searchQuery);
      if (attendanceFilter !== 'all') params.append('attendanceStatus', attendanceFilter);
  // Remove invitation filter
      if (idCardFilter !== 'all') params.append('hasIdCard', idCardFilter);
      const queryParams = params.toString();
      const response = await fetch(`/api/admin/analytics/${eventId}?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data: AnalyticsData = await response.json();
      if (append) {
        setAllUsers(prev => [...prev, ...data.data]);
        // merge pagination & data into analytics but preserve existing trends if includeTrends is false
        setAnalytics(prev => {
          const base = prev ? { ...prev } : { ...data };
          base.data = [...(prev ? prev.data : []), ...data.data];
          base.pagination = data.pagination;
          // If server didn't include trends (we requested skip), keep previous trends
          if (!includeTrends && prev && prev.summary) {
            base.summary = { ...data.summary, registrationTrends: prev.summary.registrationTrends, attendanceTrends: prev.summary.attendanceTrends };
          } else {
            base.summary = data.summary;
          }
          return base;
        });
      } else {
        // replace data; but if trends not requested, preserve previous trends so charts don't refresh
        if (!includeTrends) {
          setAnalytics(prev => {
            const preserved = prev?.summary ? { registrationTrends: prev.summary.registrationTrends, attendanceTrends: prev.summary.attendanceTrends } : { registrationTrends: [], attendanceTrends: [] };
            return { ...data, summary: { ...data.summary, registrationTrends: preserved.registrationTrends, attendanceTrends: preserved.attendanceTrends } };
          });
        } else {
          setAnalytics(data);
        }
        setAllUsers(data.data);
      }
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (includeTrends) setTrendsLoading(false);
    }
  }, [activeTab, searchQuery, attendanceFilter, idCardFilter, collegeFilter, hostelFilter, departmentFilter]);

  // Keep a ref to the latest fetchAnalytics so effects that only depend on selectedEventId can call it
  const fetchAnalyticsRef = useRef(fetchAnalytics);
  useEffect(() => { fetchAnalyticsRef.current = fetchAnalytics; }, [fetchAnalytics]);

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    setExportLoading(true);
    try {
      // Map UI columns to exportable fields (can expand keys into multiple fields)
      const uiToExportFields = (key: string): string[] => {
        switch (key) {
          case 'main_gate':
            return ['verifier'];
          case 'enclosure':
            return ['enclosure_no'];
          case 'entry':
            return ['entry_time'];
          case 'documents':
            return ['invitation', 'id_card'];
          default:
            return [key];
        }
      };
      const selectedColumns = (activeTab === 'faculty' ? facultyColumns : hostelColumns);
      const exportFields = Array.from(new Set(selectedColumns.flatMap(uiToExportFields)));
      const params = new URLSearchParams();
      // Export all filters currently applied
      if (activeTab === 'faculty') {
        params.append('hasCollege', 'true');
        params.append('noCollegeId', 'true');
        params.append('fields', exportFields.join(','));
        if (collegeFilter !== 'all') params.append('college', collegeFilter);
        if (collegeFilter !== 'all' && departmentFilter !== 'all') params.append('department', departmentFilter);
      } else {
        params.append('hasCollegeId', 'true');
        params.append('fields', exportFields.join(','));
        if (hostelFilter !== 'all') params.append('hostel', hostelFilter);
        if (collegeFilter !== 'all') params.append('college', collegeFilter);
        if (collegeFilter !== 'all' && departmentFilter !== 'all') params.append('department', departmentFilter);
      }
      if (searchQuery) params.append('search', searchQuery);
      if (attendanceFilter !== 'all') params.append('attendanceStatus', attendanceFilter);
      if (idCardFilter !== 'all') params.append('hasIdCard', idCardFilter);
      const queryParams = params.toString();
      const response = await fetch(`/api/admin/analytics/${selectedEventId}/export?${queryParams}`);
      if (!response.ok) throw new Error('Failed to export CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-${selectedEventId}-${activeTab}-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Removed IntersectionObserver (manual pagination now)


  // Reset and fetch when event changes
  useEffect(() => {
    if (selectedEventId) {
      // Fetch lightweight event summary (independent of tab/filters)
      setSummaryLoading(true);
      fetch(`/api/admin/analytics/${selectedEventId}/summary`)
        .then(res => res.json())
        .then(res => setEventSummary(res.summary))
        .catch(err => { console.error('Failed to fetch event summary', err); setEventSummary(null); })
        .finally(() => setSummaryLoading(false));
      const timeoutId = setTimeout(() => {
        // Initial load for a newly selected event: include trends
        fetchAnalyticsRef.current(selectedEventId, 1, false, true);
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    } else {
      setAnalytics(null);
      setEventSummary(null);
      setAllUsers([]);
    }
  }, [selectedEventId]);

  // Re-fetch trends when tab (faculty/hostel) changes so graphs update.
  useEffect(() => {
    if (!selectedEventId) return;
    // Request trends for the new tab. This will refresh summary.trends on the server response.
    // Use a short debounce to avoid rapid double-calls when user toggles quickly.
    const id = setTimeout(() => {
      fetchAnalyticsRef.current(selectedEventId, 1, false, true);
    }, 150);
    return () => clearTimeout(id);
  }, [activeTab, selectedEventId]);

  // When search query changes, use longer debounce (500ms) for better UX while typing
  useEffect(() => {
    if (!selectedEventId) return;
    // If search is empty, fetch immediately without debounce
    if (searchQuery === '') {
      setSearchLoading(false);
      fetchAnalyticsRef.current(selectedEventId, 1, false, false);
      return;
    }
    // Show loading immediately
    setSearchLoading(true);
    setLoading(true);
    setAllUsers([]);
    const id = setTimeout(() => {
      fetchAnalyticsRef.current(selectedEventId, 1, false, false);
      setSearchLoading(false);
    }, 500);
    return () => clearTimeout(id);
  }, [searchQuery, selectedEventId]);

  // When other filters/selects change, fetch page 1 of results (without trends) with shorter debounce
  useEffect(() => {
    if (!selectedEventId) return;
    // Show loading immediately
    setLoading(true);
    setAllUsers([]);
    const id = setTimeout(() => {
      fetchAnalyticsRef.current(selectedEventId, 1, false, false);
    }, 250);
    return () => clearTimeout(id);
  }, [attendanceFilter, idCardFilter, collegeFilter, hostelFilter, departmentFilter, selectedEventId]);

  // Reset department when college changes to avoid stale department selection
  useEffect(() => {
    setDepartmentFilter('all');
  }, [collegeFilter]);

  // Attach scroll handler to scroll container to auto-load next page when near bottom.
  // This is placed after fetchAnalytics declaration so the callback is defined.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!analytics) return;
      if (loadingMore) return;
      if (!analytics.pagination.hasMore) return;
      const threshold = 150; // px
      if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
        if (selectedEventId) {
          // Use ref to call latest fetchAnalytics and skip trends during scroll pagination
          fetchAnalyticsRef.current(selectedEventId, currentPage + 1, true, false);
        }
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [analytics, loadingMore, selectedEventId, currentPage]);

  // When loadingMore becomes true, scroll the container to show the skeleton rows
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (!loadingMore) return;

    // Delay slightly so skeleton rows render, then scroll to bottom smoothly
    const id = setTimeout(() => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' as ScrollBehavior });
      } catch (e) {
        // fallback
        el.scrollTop = el.scrollHeight;
      }
    }, 80);

    return () => clearTimeout(id);
  }, [loadingMore]);

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-semibold">Event Analytics</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Combobox
            options={Object.fromEntries(events.map(ev => [ev._id, ev.title]))}
            title="Select event"
            searchText="Search events..."
            searchEmptyMessage="No events found"
            value={selectedEventId}
            setValue={setSelectedEventId}
            className="w-full sm:w-[300px]"
            disabled={events.length === 0}
          />
        </div>
      </div>


      {/* Summary Cards – only render when an event is selected */}
      {selectedEventId && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-2">
          {(summaryLoading || !eventSummary) ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={`summary-skel-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-24" /></CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-7 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventSummary.totalRegistrations}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With Invitation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventSummary.withInvitation}</div>
                  <p className="text-xs text-muted-foreground">{eventSummary.invitationPercentage}% of total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attended</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventSummary.attendedCount}</div>
                  <p className="text-xs text-muted-foreground">{eventSummary.attendancePercentage}% of total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With ID Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{eventSummary.withIdCard}</div>
                  <p className="text-xs text-muted-foreground">{eventSummary.idCardPercentage}% of total</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Tabs above graphs */}
      <div className="flex flex-col gap-2 mt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'faculty' | 'hostel')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-2">
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="hostel">Hostel Students</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading && !analytics ? (
        <>
          {/* Graph skeletons during initial load */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-56" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-[95%] h-[85%]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-56" />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="w-full h-full flex items-center justify-center">
                  <Skeleton className="w-[95%] h-[85%]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed view table skeleton */}
          <Card className="gap-2 mt-6">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                <Skeleton className="h-5 w-40" />
              </CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <div style={{maxHeight: 600, overflowY: 'auto'}}>
                  <table className="min-w-max table-auto w-full">
                    <thead className="bg-background z-10 sticky top-0">
                      <tr>
                        {(activeTab === 'faculty' ? FACULTY_COLUMNS : HOSTEL_COLUMNS)
                          .filter(col => (activeTab === 'faculty' ? facultyColumns : hostelColumns).includes(col.key) && col.key !== 'status')
                          .map(col => (
                            <th key={`skel-head-${col.key}`} className="px-4 py-2 text-left font-medium text-sm text-muted-foreground whitespace-nowrap">
                              {col.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <tr key={`initial-loading-${i}`}>
                          {(activeTab === 'faculty' ? FACULTY_COLUMNS : HOSTEL_COLUMNS)
                            .filter(col => (activeTab === 'faculty' ? facultyColumns : hostelColumns).includes(col.key) && col.key !== 'status')
                            .map(col => (
                              <td key={`skel-${col.key}-${i}`} className="px-4 py-2">
                                <Skeleton className="h-4 w-full" />
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination hint skeleton */}
              <div className="flex items-center justify-between px-2 mt-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        </>
      ) : analytics ? (
        <>
          {/* Graphs by tab */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'faculty' ? 'Registrations by College' : 'Registrations by Hostel'}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {trendsLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skeleton className="w-[95%] h-[85%]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.summary.registrationTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="value" name="Registrations" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === 'faculty' ? 'Attendance by College' : 'Attendance by Hostel'}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {trendsLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Skeleton className="w-[95%] h-[85%]" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.summary.attendanceTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="value" name="Attendees" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed View with header actions */}
          <Card className="gap-2">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Detailed View</CardTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Columns</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Select Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(activeTab === 'faculty' ? FACULTY_COLUMNS : HOSTEL_COLUMNS).map(col => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={(activeTab === 'faculty' ? facultyColumns : hostelColumns).includes(col.key)}
                        onCheckedChange={(checked) => {
                          if (activeTab === 'faculty') {
                            setFacultyColumns(cols => checked ? [...cols, col.key] : cols.filter(k => k !== col.key));
                          } else {
                            setHostelColumns(cols => checked ? [...cols, col.key] : cols.filter(k => k !== col.key));
                          }
                        }}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={handleExportCSV}
                  disabled={!selectedEventId || loading || exportLoading}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  title="Export filtered data as CSV with selected columns"
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-6 my-4 items-start">
                <div className="flex flex-col gap-1 min-w-[220px] flex-1">
                  <Label htmlFor="search" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attendance</Label>
                  <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Attendance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="attended">Attended</SelectItem>
                      <SelectItem value="not_attended">Not Attended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID Card</Label>
                  <Select value={idCardFilter} onValueChange={setIdCardFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="ID Card" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">With ID</SelectItem>
                      <SelectItem value="false">No ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Dynamic selects by tab */}
                {activeTab === 'faculty' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">College</Label>
                      <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="College" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {mappingsLoading ? (
                            <div className="p-2 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          ) : getOptions(mappings.colleges).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Only show department select if a specific college is selected */}
                    {collegeFilter !== 'all' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</Label>
                          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              {mappingsLoading ? (
                                <div className="p-2 space-y-2">
                                  <Skeleton className="h-4 w-36" />
                                  <Skeleton className="h-4 w-44" />
                                  <Skeleton className="h-4 w-24" />
                                </div>
                              ) : getOptions(mappings.departments.filter(dep => String(dep.college) === String(collegeFilter))).map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </>
                )}
                {activeTab === 'hostel' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hostel</Label>
                      <Select value={hostelFilter} onValueChange={setHostelFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Hostel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {mappingsLoading ? (
                            <div className="p-2 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          ) : getOptions(mappings.hostels).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">College</Label>
                      <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="College" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {mappingsLoading ? (
                            <div className="p-2 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-4 w-28" />
                            </div>
                          ) : getOptions(mappings.colleges).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Only show department select if a specific college is selected */}
                    {collegeFilter !== 'all' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Department</Label>
                          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              {mappingsLoading ? (
                                <div className="p-2 space-y-2">
                                  <Skeleton className="h-4 w-36" />
                                  <Skeleton className="h-4 w-44" />
                                  <Skeleton className="h-4 w-24" />
                                </div>
                              ) : getOptions(mappings.departments.filter(dep => dep.college === collegeFilter)).map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </>
                )}
                {/* Actions moved to header */}
            </div>

              {/* Table by tab */}
              {activeTab === 'faculty' ? (
                <div className="rounded-md border overflow-x-auto">
                  <div style={{maxHeight: 600, overflowY: 'auto'}} ref={scrollContainerRef}>
                  <table className="min-w-max table-auto w-full">
                      <thead className="bg-background z-10 sticky top-0">
                        <tr>
                          {FACULTY_COLUMNS.filter(col => facultyColumns.includes(col.key) && col.key !== 'status').map(col => (
                            <th key={col.key} className="px-4 py-2 text-left font-medium text-sm text-muted-foreground whitespace-nowrap">{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading && allUsers.length === 0 && (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={`loading-fac-${i}`}>
                              {FACULTY_COLUMNS.filter(col => facultyColumns.includes(col.key) && col.key !== 'status').map(col => (
                                <td key={`${col.key}-loading-${i}`} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td>
                              ))}
                            </tr>
                          ))
                        )}
                        {!loading && allUsers.map((user) => (
                          <tr key={user._id}>
                            {FACULTY_COLUMNS.filter(col => facultyColumns.includes(col.key) && col.key !== 'status').map(col => {
                              switch (col.key) {
                                case 'name': return <td key={col.key} className="font-medium px-4 py-2 whitespace-nowrap">{user.name}</td>;
                                case 'email': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.email}</td>;
                                case 'department': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.department?.name || '-'}</td>;
                                case 'college': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.college?.name || '-'}</td>;
                                case 'main_gate': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.verifier?.name || '-'}</td>;
                                case 'enclosure': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.enclosure_no || '-'}</td>;
                                case 'documents':
                                  return <td key={col.key} className="px-4 py-2 whitespace-nowrap"><div className="flex gap-2 justify-center flex-wrap">{user.eventInfo.hasInvitation && user.eventInfo.invitation ? (<a href={user.eventInfo.invitation} target="_blank" rel="noopener noreferrer" className="inline-flex"><Badge variant="default" className="gap-1 cursor-pointer hover:bg-primary/80"><FileText className="h-3 w-3" />Invitation<ExternalLink className="h-3 w-3" /></Badge></a>) : (<Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />No Invitation</Badge>)}{user.eventInfo.hasIdCard && user.eventInfo.id_card ? (<a href={user.eventInfo.id_card} target="_blank" rel="noopener noreferrer" className="inline-flex"><Badge variant="default" className="gap-1 cursor-pointer hover:bg-primary/80"><IdCard className="h-3 w-3" />ID Card<ExternalLink className="h-3 w-3" /></Badge></a>) : (<Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />No ID Card</Badge>)}</div></td>;
                                case 'entry':
                                  return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.entry_time ? (<div className="text-sm"><div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(user.eventInfo.entry_time)}</div>{user.eventInfo.entry_gate && (<div className="text-muted-foreground">Gate: {user.eventInfo.entry_gate}</div>)}</div>) : (<span className="text-muted-foreground">-</span>)}</td>;
                                default: return null;
                              }
                            })}
                          </tr>
                        ))}
                        {loadingMore && Array.from({ length: 3 }).map((_, idx) => (
                          <tr key={`skeleton-${idx}`}> 
                            {FACULTY_COLUMNS.filter(col => facultyColumns.includes(col.key) && col.key !== 'status').map(col => (
                              <td key={`${col.key}-skeleton-${idx}`} className="px-4 py-2 whitespace-nowrap"><Skeleton className="h-4 w-full rounded-md" /></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <div style={{maxHeight: 600, overflowY: 'auto'}} ref={scrollContainerRef}>
                  <table className="min-w-max table-auto w-full">
                      <thead className="bg-background z-10 sticky top-0">
                        <tr>
                          {HOSTEL_COLUMNS.filter(col => hostelColumns.includes(col.key) && col.key !== 'status').map(col => (
                            <th key={col.key} className="px-4 py-2 text-left font-medium text-sm text-muted-foreground whitespace-nowrap">{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading && allUsers.length === 0 && (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={`loading-hostel-${i}`}>
                              {HOSTEL_COLUMNS.filter(col => hostelColumns.includes(col.key) && col.key !== 'status').map(col => (
                                <td key={`${col.key}-loading-h-${i}`} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td>
                              ))}
                            </tr>
                          ))
                        )}
                        {!loading && allUsers.map((user) => (
                          <tr key={user._id}>
                            {HOSTEL_COLUMNS.filter(col => hostelColumns.includes(col.key) && col.key !== 'status').map(col => {
                              switch (col.key) {
                                case 'name': return <td key={col.key} className="font-medium px-4 py-2 whitespace-nowrap">{user.name}</td>;
                                case 'email': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.email}</td>;
                                case 'hostel': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.hostel?.name || '-'}</td>;
                                case 'department': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.department?.name || '-'}</td>;
                                case 'college': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.college?.name || '-'}</td>;
                                case 'college_id': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.college_id ? String(user.college_id) : '-'}</td>;
                                case 'main_gate': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.verifier?.name || '-'}</td>;
                                case 'enclosure': return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.enclosure_no || '-'}</td>;
                                case 'entry':
                                  return <td key={col.key} className="px-4 py-2 whitespace-nowrap">{user.eventInfo.entry_time ? (<div className="text-sm"><div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(user.eventInfo.entry_time)}</div></div>) : (<span className="text-muted-foreground">-</span>)}</td>;
                                default: return null;
                              }
                            })}
                          </tr>
                        ))}
                        {loadingMore && Array.from({ length: 3 }).map((_, idx) => (
                          <tr key={`skeleton-hostel-${idx}`}> 
                            {HOSTEL_COLUMNS.filter(col => hostelColumns.includes(col.key) && col.key !== 'status').map(col => (
                              <td key={`${col.key}-skeleton-${idx}`} className="px-4 py-2 whitespace-nowrap"><Skeleton className="h-4 w-full rounded-md" /></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination status (auto-load on scroll) */}
              <div className="flex items-center justify-between px-2 mt-2">
                <div className="text-sm text-muted-foreground">
                  Showing {allUsers.length} of {analytics.pagination.totalCount} entries
                </div>
                <div className="text-sm text-muted-foreground">
                  {!analytics.pagination.hasMore ? 'All loaded' : ''}
                </div>
              </div>
            </CardContent>
          </Card>
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
