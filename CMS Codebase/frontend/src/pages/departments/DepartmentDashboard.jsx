import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Calendar,
  MessageSquare,
  CheckSquare,
  Check,
  FileText,
  ArrowLeft,
  X,
  Settings,
  FolderOpen,
  Plus,
  Search,
  Filter,
  Bell,
  Clock,
  AlertCircle,
  CheckCircle2,
  Image,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import { FullPageLoading } from '../../components/common/Loading';
import { API_ENDPOINTS } from '../../constants/api';
import ComponentAllocation from './components/ComponentAllocation';
import PermissionManagement from './components/PermissionManagement';
import DepartmentBranding from './components/DepartmentBranding';
import GmailMessageList from '../../components/common/GmailMessageList';
import ActivityFeed from '../../components/departments/ActivityFeed';
import CollectionTracker from '../../components/events/CollectionTracker';
import ApplePhotoGrid from '../../components/gallery/ApplePhotoGrid';
import PhotoLightbox from '../../components/gallery/PhotoLightbox';

const DepartmentDashboard = () => {
  const { departmentSlug } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { colors } = useColorPalette();
  const location = useLocation();
  
  // Get user's role in this department from navigation state
  const userRole = location.state?.role || 'Member';
  const isAdmin = location.state?.isAdmin || false;
  
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [communications, setCommunications] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersSort, setMembersSort] = useState('name');
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [showCommModal, setShowCommModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventCollection, setSelectedEventCollection] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [commForm, setCommForm] = useState({
    title: '',
    message: '',
    type: 'Announcement',
    priority: 'normal',
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    duration: 60,
    location: '',
    type: 'Meeting',
    hasCollection: false,
    collectionTitle: '',
    collectionDescription: '',
    collectionTargetAmount: '',
    collectionVisibility: 'department',
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    assignee: '',
  });
  const [commSelectedItems, setCommSelectedItems] = useState(new Set());
  const [commActiveTab, setCommActiveTab] = useState('all');
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: ''
  });

  const fetchWithRetry = async (fetchFn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fetchFn()
        return result
      } catch (error) {
        if (error.response?.status === 429 && i < retries - 1) {
          // Exponential backoff for rate limiting
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
          continue
        }
        throw error
      }
    }
  }

  const fetchDepartmentDashboard = useCallback(async () => {
    const fetchWithRetry = async (fetchFn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const result = await fetchFn()
          return result
        } catch (error) {
          if (error.response?.status === 429 && i < retries - 1) {
            // Exponential backoff for rate limiting
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
            continue
          }
          throw error
        }
      }
    }

    try {
      setError(null);
      setErrorType(null);
      const response = await fetchWithRetry(() => api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.DASHBOARD(departmentSlug)));

      console.log('Dashboard response:', response.data);
      setDashboard(response.data.department || response.data.data);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to load department dashboard';
      
      if (error.response?.status === 403) {
        setErrorType('forbidden');
        setError(errorMessage);
      } else if (error.response?.status === 404) {
        setErrorType('not_found');
        setError(errorMessage);
      } else if (error.response?.status === 401) {
        setErrorType('unauthorized');
        setError('Your session has expired. Please log in again.');
      } else if (error.response?.status === 429) {
        setErrorType('rate_limit');
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setErrorType('network_error');
        setError(errorMessage);
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [departmentSlug, api]);

  useEffect(() => {
    setLoading(true);
    fetchDepartmentDashboard();
  }, [departmentSlug, fetchDepartmentDashboard]);

  const loadCommunications = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await fetchWithRetry(() => api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.COMMUNICATIONS(departmentSlug) + '?limit=50'));
      setCommunications(res.data.data || []);
    } catch (e) {
      console.error('Failed to load communications:', e);
      toast.error(e.response?.data?.error || e.message || 'Failed to load communications');
      setCommunications([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug, api]);

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.PENDING_REQUESTS(departmentSlug));
      setPendingRequests(res.data.data || []);
    } catch (e) {
      console.error('Failed to load pending requests:', e);
      setPendingRequests([]);
    }
  }, [departmentSlug, api]);

  const loadMembers = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.MEMBERS(departmentSlug));
      setMembers(res.data.data || []);
      loadPendingRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug, api, loadPendingRequests]);

  const loadEvents = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await fetchWithRetry(() => api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.MEETINGS(departmentSlug)));
      setEvents(res.data.data || []);
    } catch (e) {
      console.error('Failed to load events:', e);
      toast.error(e.response?.data?.error || e.message || 'Failed to load events');
      setEvents([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug, api]);

  const loadTasks = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await fetchWithRetry(() => api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.TASKS(departmentSlug)));
      setTasks(res.data.data || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
      toast.error(e.response?.data?.error || e.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug, api]);

  const loadResources = useCallback(async () => {
    setTabLoading(true);
    try {
      const res = await fetchWithRetry(() => api.get(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.RESOURCES(departmentSlug)));
      setResources(res.data.data || []);
    } catch (e) {
      console.error('Failed to load resources:', e);
      toast.error(e.response?.data?.error || e.message || 'Failed to load resources');
      setResources([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug, api]);

  const loadGalleryPhotos = useCallback(async () => {
    setTabLoading(true);
    try {
      // Use the same API pattern as the admin gallery
      const response = await fetch('/api/gallery/photos?limit=50');
      const data = await response.json();
      setGalleryPhotos(data.photos || []);
    } catch (e) {
      console.error('Failed to load gallery photos:', e);
      toast.error('Failed to load gallery photos');
      setGalleryPhotos([]);
    } finally {
      setTabLoading(false);
    }
  }, [departmentSlug]);

  const handleApproveMember = async (userId) => {
    try {
      await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.APPROVE_REQUEST(departmentSlug, userId));
      toast.success('Membership approved successfully');
      loadPendingRequests();
      loadMembers();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to approve membership');
    }
  };

  const handleRejectMember = async (userId) => {
    try {
      await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.REJECT_REQUEST(departmentSlug, userId));
      toast.success('Membership rejected successfully');
      loadPendingRequests();
      loadMembers();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || e.message || 'Failed to reject membership');
    }
  };

  const handleActivityClick = (activity) => {
    // Handle navigation to relevant section based on activity type
    switch (activity.activity_type) {
      case 'communication':
        setActiveTab('communications');
        break;
      case 'meeting_created':
        setActiveTab('events');
        break;
      case 'task_created':
      case 'task_completed':
        setActiveTab('tasks');
        break;
      case 'approval_requested':
        setActiveTab('members');
        break;
      case 'resource_added':
        setActiveTab('resources');
        break;
      default:
        // For other activities, you might show a modal or navigate to details
        console.log('Activity clicked:', activity);
    }
  };

  const handleActivityAction = async (activity, action) => {
    // Handle approve/reject actions from activity feed
    if (activity.activity_type === 'approval_requested' && activity.metadata?.user_id) {
      const userId = activity.metadata.user_id;

      if (action === 'approve') {
        await handleApproveMember(userId);
      } else if (action === 'reject') {
        await handleRejectMember(userId);
      }
    }
  };

  const handleOpenEditModal = () => {
    setEditFormData({
      name: department?.name,
      description: department?.description || '',
      category: department?.category
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditFormData({
      name: '',
      description: '',
      category: ''
    });
  };

  const handleSaveDepartmentInfo = async () => {
    try {
      const response = await api.put(`/departments/${departmentSlug}`, editFormData);
      toast.success('Department information updated successfully');
      setDashboard(prev => ({
        ...prev,
        department: { ...prev.department, ...editFormData }
      }));
      handleCloseEditModal();
    } catch (error) {
      console.error('Failed to update department:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update department information');
    }
  };

  const loadEventCollection = async (eventId) => {
    try {
      // Find collection for this event
      const response = await api.get('/collections');
      const collections = response.data.data || [];
      const eventCollection = collections.find(c => c.event_id === eventId);
      setSelectedEventCollection(eventCollection || null);
    } catch (error) {
      console.error('Failed to load collection:', error);
      setSelectedEventCollection(null);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    if (event.has_collection) {
      loadEventCollection(event.id);
    } else {
      setSelectedEventCollection(null);
    }
  };

  const handleCommBulkAction = async (action) => {
    try {
      if (action === 'delete') {
        if (confirm(`Are you sure you want to delete ${commSelectedItems.size} communications?`)) {
          for (const id of commSelectedItems) {
            await fetch('/api' + API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.COMMUNICATIONS(departmentSlug) + '/' + id, {
              method: 'DELETE',
              headers: authHeaders(),
            });
          }
          toast.success(`${commSelectedItems.size} communications deleted`);
        }
      } else if (action === 'archive') {
        toast.success('Communications archived');
      } else if (action === 'markRead') {
        toast.success('Communications marked as read');
      }
      setCommSelectedItems(new Set());
      loadCommunications();
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      toast.error('Failed to perform action');
    }
  };

  const handleCommRowAction = (action, item) => {
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this communication?')) {
        fetch('/api' + API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.COMMUNICATIONS(departmentSlug) + '/' + item.id, {
          method: 'DELETE',
          headers: authHeaders(),
        }).then(() => {
          toast.success('Communication deleted');
          loadCommunications();
        }).catch((error) => {
          toast.error('Failed to delete communication');
        });
      }
    } else if (action === 'star') {
      toast.success('Communication starred');
    } else if (action === 'archive') {
      toast.success('Communication archived');
    } else if (action === 'markRead') {
      toast.success('Communication marked as read');
    } else if (action === 'snooze') {
      toast.success('Communication snoozed');
    } else if (action === 'view') {
      // Could open a detail view modal
      toast.success('Viewing communication');
    }
  };

  const handleCommToggleSelect = (id) => {
    const newSelected = new Set(commSelectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setCommSelectedItems(newSelected);
  };

  const handleCommToggleSelectAll = (checked) => {
    if (checked) {
      setCommSelectedItems(new Set(filteredCommunications.map(c => c.id)));
    } else {
      setCommSelectedItems(new Set());
    }
  };

  const commTabs = [
    { id: 'all', label: 'All' },
    { id: 'Announcement', label: 'Announcements' },
    { id: 'Meeting', label: 'Meetings' },
    { id: 'Report', label: 'Reports' },
    { id: 'Event', label: 'Events' },
  ];

  const filteredCommunications = (communications || []).filter(comm => {
    if (commActiveTab === 'all') return true;
    return comm.type === commActiveTab;
  }).map(comm => ({
    ...comm,
    sender: comm.sender || 'Department',
    subject: comm.title,
    content: comm.message,
    type: comm.type,
    priority: comm.priority,
    read: true,
    starred: false,
    created_at: comm.sent_at
  }));

  useEffect(() => {
    if (!departmentSlug) return;
    if (activeTab === 'communications') loadCommunications();
    else if (activeTab === 'members') loadMembers();
    else if (activeTab === 'events') loadEvents();
    else if (activeTab === 'tasks') loadTasks();
    else if (activeTab === 'resources') loadResources();
    else if (activeTab === 'gallery') loadGalleryPhotos();
  }, [activeTab, departmentSlug, loadCommunications, loadMembers, loadEvents, loadTasks, loadResources, loadGalleryPhotos]);

  const submitCommunication = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.COMMUNICATIONS(departmentSlug), {
        title: commForm.title,
        message: commForm.message,
        type: commForm.type,
        priority: commForm.priority,
      });
      
      toast.success('Communication posted');
      setShowCommModal(false);
      setCommForm({ title: '', message: '', type: 'Announcement', priority: 'normal' });
      loadCommunications();
      fetchDepartmentDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to post communication');
    }
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.MEETINGS(departmentSlug), {
        title: eventForm.title,
        description: eventForm.description,
        meetingDate: eventForm.eventDate,
        duration: Number(eventForm.duration) || 60,
        location: eventForm.location,
      });
      
      const eventId = res.data?.data?.id;

      // Create collection if enabled
      if (eventForm.hasCollection && eventForm.collectionTitle && eventForm.collectionTargetAmount) {
        await api.post('/collections', {
          event_id: eventId,
          title: eventForm.collectionTitle,
          description: eventForm.collectionDescription,
          target_amount: parseFloat(eventForm.collectionTargetAmount),
          visibility: eventForm.collectionVisibility,
        });
      }
      
      toast.success('Event created' + (eventForm.hasCollection ? ' with collection' : ''));
      setShowEventModal(false);
      setEventForm({ 
        title: '', 
        description: '', 
        eventDate: '', 
        duration: 60, 
        location: '', 
        type: 'Meeting',
        hasCollection: false,
        collectionTitle: '',
        collectionDescription: '',
        collectionTargetAmount: '',
        collectionVisibility: 'department',
      });
      loadEvents();
      fetchDepartmentDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create event');
    }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.TASKS(departmentSlug), {
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
        priority: taskForm.priority,
        assignedTo: taskForm.assignee,
      });
      
      toast.success('Task created');
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'medium', assignee: '' });
      loadTasks();
      fetchDepartmentDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.TASK_BY_ID(departmentSlug, taskId), { status });
      toast.success('Task status updated');
      loadTasks();
      fetchDepartmentDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.delete(API_ENDPOINTS.DEPARTMENTS.DEPARTMENT.TASK_BY_ID(departmentSlug, taskId));
      toast.success('Task deleted');
      loadTasks();
      fetchDepartmentDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete task');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return { color: colors.error, bg: colors.error + '20' };
      case 'high':
        return { color: colors.warning, bg: colors.warning + '20' };
      case 'normal':
        return { color: colors.primary, bg: colors.primary + '20' };
      case 'low':
        return { color: colors.textSecondary, bg: colors.border + '20' };
      default:
        return { color: colors.textSecondary, bg: colors.border + '20' };
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'communication':
        return <MessageSquare className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const tabs = isAdmin ? [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: FileText },
    { id: 'members', label: 'Members', shortLabel: 'Members', icon: Users },
    { id: 'communications', label: 'Communications', shortLabel: 'Comm', icon: MessageSquare },
    { id: 'events', label: 'Events', shortLabel: 'Events', icon: Calendar },
    { id: 'gallery', label: 'Gallery', shortLabel: 'Gallery', icon: Image },
    { id: 'tasks', label: 'Tasks', shortLabel: 'Tasks', icon: CheckSquare },
    { id: 'resources', label: 'Resources', shortLabel: 'Resources', icon: FolderOpen },
    { id: 'treasury', label: 'Treasury', shortLabel: 'Treasury', icon: DollarSign },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  ] : [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: FileText },
    { id: 'events', label: 'Events', shortLabel: 'Events', icon: Calendar },
    { id: 'gallery', label: 'Gallery', shortLabel: 'Gallery', icon: Image },
    { id: 'resources', label: 'Resources', shortLabel: 'Resources', icon: FolderOpen },
  ];

  if (loading) {
    return <FullPageLoading message="Loading department dashboard..." />
  }

  if (error || !dashboard) {
    const renderErrorState = () => {
      switch (errorType) {
        case 'forbidden':
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]  mb-2">Access Denied</h2>
              <p className="text-[var(--color-textSecondary)]  text-center max-w-md mb-6">
                {error || 'You do not have permission to access this department dashboard.'}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mb-6">
                <h3 className="font-medium text-yellow-800 mb-2">To resolve this issue:</h3>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Contact your department head to request access</li>
                  <li>Ensure you are a member of this department</li>
                  <li>Check with the church administrator if you believe this is an error</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard/my-departments')}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  View My Departments
                </button>
                <button
                  onClick={() => navigate('/dashboard/departments')}
                  className="px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Browse All Departments
                </button>
              </div>
            </div>
          );

        case 'not_found':
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-[var(--color-surface)]  rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-[var(--color-textSecondary)] " />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]  mb-2">Department Not Found</h2>
              <p className="text-[var(--color-textSecondary)]  text-center max-w-md mb-6">
                {error || 'The department you are looking for does not exist or has been deleted.'}
              </p>
              <div className="bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg p-4 max-w-md mb-6">
                <h3 className="font-medium text-[var(--color-primary)]-800 mb-2">To resolve this issue:</h3>
                <ul className="text-sm text-[var(--color-primary)]-700 space-y-1 list-disc list-inside">
                  <li>Check the department ID in the URL</li>
                  <li>Browse the list of available departments</li>
                  <li>Contact the church administrator if you believe this is an error</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard/departments')}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Browse Departments
                </button>
                <button
                  onClick={() => navigate('/dashboard/my-departments')}
                  className="px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  My Departments
                </button>
              </div>
            </div>
          );

        case 'unauthorized':
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]  mb-2">Session Expired</h2>
              <p className="text-[var(--color-textSecondary)]  text-center max-w-md mb-6">
                {error || 'Your session has expired. Please log in again to continue.'}
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mb-6">
                <h3 className="font-medium text-orange-800 mb-2">To resolve this issue:</h3>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Log out and log back in to refresh your session</li>
                  <li>Clear your browser cache if the issue persists</li>
                  <li>Contact support if you continue to experience issues</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/login');
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Log In Again
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          );

        case 'network_error':
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-[var(--color-surface)]  rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-[var(--color-textSecondary)] " />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]  mb-2">Connection Error</h2>
              <p className="text-[var(--color-textSecondary)]  text-center max-w-md mb-6">
                {error || 'Unable to connect to the server. Please check your internet connection.'}
              </p>
              <div className="bg-[var(--color-background)]  border border-[var(--color-border)]  rounded-lg p-4 max-w-md mb-6">
                <h3 className="font-medium text-[var(--color-text)] mb-2">To resolve this issue:</h3>
                <ul className="text-sm text-[var(--color-text)]  space-y-1 list-disc list-inside">
                  <li>Check your internet connection</li>
                  <li>Refresh the page to try again</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          );

        case 'server_error':
        default:
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--color-text)]  mb-2">Error Loading Dashboard</h2>
              <p className="text-[var(--color-textSecondary)]  text-center max-w-md mb-6">
                {error || 'An unexpected error occurred while loading the department dashboard.'}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mb-6">
                <h3 className="font-medium text-red-800 mb-2">To resolve this issue:</h3>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Refresh the page to try again</li>
                  <li>Contact the church administrator if the issue persists</li>
                  <li>Check the server logs for more details</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => fetchDepartmentDashboard()}
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/dashboard/departments')}
                  className="px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Browse Departments
                </button>
              </div>
            </div>
          );
      }
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        {renderErrorState()}
      </div>
    );
  }

  const { department, metrics, recentActivities, upcomingMeetings, pendingTasks } = dashboard || {
    department: {},
    metrics: { total_members: 0, communications_this_month: 0, meetings_this_month: 0, pending_tasks: 0 },
    recentActivities: [],
    upcomingMeetings: [],
    pendingTasks: []
  };

  const modalBackdrop = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';

  const renderTabContent = () => {
    if (tabLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div style={{ color: colors.textSecondary }}>Loading...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg shadow p-4 sm:p-6" style={{ backgroundColor: colors.surface }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>Total Members</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{metrics?.total_members || 0}</p>
                  </div>
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ml-2" style={{ color: colors.primary }} />
                </div>
              </div>
              <div className="rounded-lg shadow p-4 sm:p-6" style={{ backgroundColor: colors.surface }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>Upcoming Events</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{upcomingMeetings?.length || 0}</p>
                  </div>
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ml-2" style={{ color: colors.success }} />
                </div>
              </div>
              <div className="rounded-lg shadow p-4 sm:p-6" style={{ backgroundColor: colors.surface }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>Pending Tasks</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{pendingTasks?.length || 0}</p>
                  </div>
                  <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ml-2" style={{ color: colors.warning }} />
                </div>
              </div>
              <div className="rounded-lg shadow p-4 sm:p-6" style={{ backgroundColor: colors.surface }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm truncate" style={{ color: colors.textSecondary }}>Communications</p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{metrics?.communications_this_month || 0}</p>
                  </div>
                  <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ml-2" style={{ color: colors.primary }} />
                </div>
              </div>
            </div>

            {/* Department Info Card */}
            <div className="rounded-lg shadow p-4 sm:p-6" style={{ backgroundColor: colors.surface }}>
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: colors.text }}>Department Information</h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>Department Name</p>
                  <p className="text-sm sm:text-base font-medium truncate" style={{ color: colors.text }}>{department?.name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>Category</p>
                  <p className="text-sm sm:text-base font-medium truncate" style={{ color: colors.text }}>{department?.category}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm" style={{ color: colors.textSecondary }}>Your Role</p>
                  <p className="text-sm sm:text-base font-medium truncate" style={{ color: colors.text }}>{department?.userRole}</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <ActivityFeed
              departmentSlug={departmentSlug}
              api={api}
              limit={5}
              showViewAll={true}
              onViewAllClick={() => navigate(`/dashboard/departments/${department?.slug || departmentSlug}/activity`)}
              onActivityClick={handleActivityClick}
              onActionClick={handleActivityAction}
            />
          </div>
        );

      case 'members':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)] ">Members</h2>
              <select
                value={membersSort}
                onChange={(e) => setMembersSort(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)]  focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent"
              >
                <option value="name">Sort by Name</option>
                <option value="role">Sort by Role</option>
                <option value="joined">Sort by Joined Date</option>
              </select>
            </div>

            {/* Pending Requests Section */}
            {pendingRequests && pendingRequests.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-yellow-800 mb-3 sm:mb-4">
                  Pending Membership Requests ({pendingRequests?.length || 0})
                </h3>
                <div className="space-y-3">
                  {pendingRequests && pendingRequests.map((request) => (
                    <div
                      key={request.user_id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[var(--color-surface)]  rounded-lg p-3 sm:p-4 shadow-sm gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-yellow-600">
                            {request.first_name?.[0] || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-medium text-[var(--color-text)]  truncate">
                            {request.first_name} {request.last_name}
                          </h4>
                          <p className="text-xs sm:text-sm text-[var(--color-textSecondary)]  truncate">{request.email}</p>
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            Requested: {new Date(request.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleApproveMember(request.user_id)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
                        >
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Approve</span>
                          <span className="sm:hidden">✓</span>
                        </button>
                        <button
                          onClick={() => handleRejectMember(request.user_id)}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Reject</span>
                          <span className="sm:hidden">✗</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members && [...members].sort((a, b) => {
                if (membersSort === 'name') {
                  return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
                } else if (membersSort === 'role') {
                  return (a.role_in_department || '').localeCompare(b.role_in_department || '');
                } else if (membersSort === 'joined') {
                  return new Date(b.joined_at) - new Date(a.joined_at);
                }
                return 0;
              }).map((member) => (
                <div key={member.id} className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--color-primary)]-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-base sm:text-lg font-semibold text-[var(--color-primary)]-600">
                        {member.first_name?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-medium text-[var(--color-text)]  truncate">
                        {member.first_name} {member.last_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-textSecondary)]  truncate">{member.role_in_department}</p>
                    </div>
                  </div>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                    <p className="truncate">{member.email}</p>
                    {member.phone_number && <p className="truncate">{member.phone_number}</p>}
                    <p>Joined: {new Date(member.joined_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {members && members.length === 0 && (
                <div className="col-span-full text-center py-8 sm:py-12">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--color-textSecondary)] mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-[var(--color-textSecondary)]">No members found</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'communications':
        return (
          <GmailMessageList
            items={filteredCommunications}
            tabs={commTabs}
            activeTab={commActiveTab}
            onTabChange={setCommActiveTab}
            onCompose={() => setShowCommModal(true)}
            onRefresh={loadCommunications}
            onSelectAll={handleCommToggleSelectAll}
            selectedItems={commSelectedItems}
            onToggleSelect={handleCommToggleSelect}
            onBulkAction={handleCommBulkAction}
            onRowAction={handleCommRowAction}
            emptyMessage="No communications found"
            loading={tabLoading}
          />
        );

      case 'events':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)] ">
                {selectedEvent ? 'Event Details' : 'Events'}
              </h2>
              {selectedEvent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    setSelectedEventCollection(null);
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-background)]  transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Events</span>
                  <span className="sm:hidden">Back</span>
                </button>
              )}
            </div>

            {selectedEvent ? (
              <div className="space-y-4 sm:space-y-6">
                {/* Event Details Card */}
                <div className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-text)]  truncate">{selectedEvent.title}</h3>
                  </div>
                  {selectedEvent.description && (
                    <p className="text-sm sm:text-base text-[var(--color-text)]  mb-3 sm:mb-4">{selectedEvent.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                    <p className="flex items-center gap-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      {new Date(selectedEvent.meeting_date).toLocaleString()}
                    </p>
                    {selectedEvent.location && (
                      <p className="flex items-center gap-2">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        {selectedEvent.location}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Duration: {selectedEvent.duration} minutes
                    </p>
                  </div>
                </div>

                {/* Collection Tracker */}
                {selectedEventCollection && (
                  <CollectionTracker
                    collection={selectedEventCollection}
                    canContribute={true}
                    canManage={false}
                  />
                )}

                {!selectedEventCollection && selectedEvent.has_collection && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
                    <p className="text-sm sm:text-base text-yellow-800">Loading collection data...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events && events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      <h3 className="text-sm sm:text-base font-medium text-[var(--color-text)]  truncate">{event.title}</h3>
                    </div>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                      <p className="flex items-center gap-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {new Date(event.meeting_date).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          {event.location}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Duration: {event.duration} minutes
                      </p>
                      {event.has_collection && (
                        <p className="flex items-center gap-2 text-green-600">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                          Has Collection
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {events && events.length === 0 && (
                  <div className="col-span-full text-center py-8 sm:py-12">
                    <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--color-textSecondary)] mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-[var(--color-textSecondary)]">No events found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)] ">Tasks</h2>
              <button
                type="button"
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Task</span>
                <span className="sm:hidden">Task</span>
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {tasks && tasks.map((task) => (
                <div key={task.id} className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-medium text-[var(--color-text)]  truncate">{task.title}</h3>
                      <p className="text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-800' :
                        'bg-[var(--color-surface)] text-[var(--color-text)] '
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-[var(--color-text)]  mb-3">{task.description}</p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-textSecondary)]  mb-4">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">Assigned to: {task.assigned_to_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Complete</span>
                        <span className="sm:hidden">✓</span>
                      </button>
                    )}
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                      >
                        <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Start</span>
                        <span className="sm:hidden">▶</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">🗑</span>
                    </button>
                  </div>
                </div>
              ))}
              {tasks && tasks.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <CheckSquare className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--color-textSecondary)] mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-[var(--color-textSecondary)]">No tasks found</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)] ">Resources</h2>
              <button
                type="button"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Resource</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources && resources.map((resource) => (
                <div key={resource.id} className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base font-medium text-[var(--color-text)]  truncate">{resource.file_name}</h3>
                  </div>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                    <p>Type: {resource.file_type}</p>
                    <p>Uploaded: {new Date(resource.uploaded_at).toLocaleDateString()}</p>
                    <p>By: {resource.uploaded_by}</p>
                  </div>
                </div>
              ))}
              {resources && resources.length === 0 && (
                <div className="col-span-full text-center py-8 sm:py-12">
                  <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--color-textSecondary)] mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-[var(--color-textSecondary)]">No resources found</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)] ">
                {department?.name} Gallery
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/gallery')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
              >
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">View Full Gallery</span>
                <span className="sm:hidden">Gallery</span>
              </button>
            </div>

            {tabLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="text-sm sm:text-base text-[var(--color-textSecondary)]">Loading gallery...</div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {galleryPhotos && galleryPhotos.length > 0 ? (
                  <>
                    <p className="text-xs sm:text-sm text-[var(--color-textSecondary)] ">
                      Showing {galleryPhotos?.length || 0} photos from church gallery
                    </p>
                    <ApplePhotoGrid
                      photos={galleryPhotos || []}
                      onPhotoClick={(photo, index) => {
                        setCurrentPhotoIndex(index);
                        setLightboxOpen(true);
                      }}
                      enableFavorites={true}
                      gridColumns={{ mobile: 2, tablet: 3, desktop: 4, large: 5 }}
                    />
                  </>
                ) : (
                  <div className="text-center py-12 sm:py-16">
                    <Image className="w-12 h-12 sm:w-16 sm:h-16 text-[var(--color-textSecondary)] mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-[var(--color-text)]  mb-2">
                      No photos found
                    </h3>
                    <p className="text-sm sm:text-base text-[var(--color-textSecondary)]  mb-4">
                      No photos have been uploaded to the church gallery yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/gallery')}
                      className="px-3 sm:px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
                    >
                      Upload Photos
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Photo Lightbox */}
            {lightboxOpen && (
              <PhotoLightbox
                photos={galleryPhotos}
                currentIndex={currentPhotoIndex}
                onClose={() => setLightboxOpen(false)}
                onIndexChange={setCurrentPhotoIndex}
                enableFavorites={true}
              />
            )}
          </div>
        );

      case 'treasury':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)]  mb-3 sm:mb-4">Department Treasury</h2>
              <p className="text-sm sm:text-base text-[var(--color-textSecondary)] ">
                Manage department finances, budgets, and collections.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50/20 rounded-lg">
                  <p className="text-sm text-[var(--color-textSecondary)] ">Total Collections</p>
                  <p className="text-2xl font-bold text-green-600">KES 0</p>
                </div>
                <div className="p-4 bg-[var(--color-primary)]-50 rounded-lg">
                  <p className="text-sm text-[var(--color-textSecondary)] ">Budget Used</p>
                  <p className="text-2xl font-bold text-[var(--color-primary)]-600">0%</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-[var(--color-textSecondary)] ">Pending Expenses</p>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text)]  mb-3 sm:mb-4">Department Settings</h2>
              <div className="space-y-3 sm:space-y-4">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="w-full flex items-center justify-between p-3 sm:p-4 bg-[var(--color-background)]  rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                >
                  <span className="text-sm sm:text-base text-[var(--color-text)] ">Edit Department Information</span>
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 text-[var(--color-textSecondary)]" />
                </button>
              </div>
            </div>

            {/* Department Branding */}
            <DepartmentBranding
              department={department}
              onUpdate={(updates) => {
                setDashboard(prev => ({
                  ...prev,
                  department: { ...prev.department, ...updates }
                }));
              }}
            />

            {/* Permission Management */}
            <PermissionManagement departmentSlug={departmentSlug} />

            {/* Component Allocation */}
            <ComponentAllocation departmentSlug={departmentSlug} />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <FullPageLoading message="Loading department dashboard..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)] ">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Department</h2>
          <p className="text-[var(--color-textSecondary)] mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/departments')}
            className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            Back to Departments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)]  overflow-hidden">
      {/* WhatsApp Business-style Header with Banner */}
      <div className="flex-shrink-0">
        {/* Banner */}
        <div
          className="h-32 sm:h-40 bg-cover bg-center relative"
          style={{
            backgroundColor: department?.banner_color || 'var(--color-primary)',
            backgroundImage: department?.banner_url ? `url(${department?.banner_url})` : 'none'
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <button
            type="button"
            onClick={() => navigate('/dashboard/departments/overview')}
            className="absolute top-4 left-4 p-2 bg-[var(--color-surface)]/90 /90 rounded-full hover:bg-[var(--color-surface)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)] " />
          </button>
        </div>

        {/* Header with Logo */}
        <div className="bg-[var(--color-surface)]  border-b border-[var(--color-border)]  relative">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cover bg-center border-4 border-white shadow-lg -mt-12 sm:-mt-16 relative z-10 flex-shrink-0"
                  style={{
                    backgroundColor: department?.logo_color || 'var(--color-primary)',
                    backgroundImage: department?.logo_url ? `url(${department?.logo_url})` : 'none'
                  }}
                >
                  {!department?.logo_url && (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                      {department?.name?.[0] || 'D'}
                    </div>
                  )}
                </div>

                {/* Department Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]  truncate">{department?.name}</h1>
                  <p className="text-sm text-[var(--color-textSecondary)] ">{department?.category}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    {metrics?.total_members || 0} members • {department?.userRole}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCommModal(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">New Message</span>
                  <span className="sm:hidden">Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEventModal(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Event</span>
                  <span className="sm:hidden">Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Member</span>
                  <span className="sm:hidden">Member</span>
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Tab Navigation */}
          <div className="px-4 sm:px-6 border-t border-[var(--color-border)] ">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-[var(--color-primary)]-500 text-[var(--color-primary)]-700'
                        : 'border-transparent text-[var(--color-textSecondary)]  hover:text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Communication Modal */}
      {showCommModal && (
        <div className={modalBackdrop}>
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] ">
              <h2 className="text-lg font-semibold text-[var(--color-text)] ">New Communication</h2>
              <button
                type="button"
                onClick={() => setShowCommModal(false)}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={submitCommunication} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={commForm.title}
                  onChange={(e) => setCommForm({ ...commForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Type</label>
                <select
                  value={commForm.type}
                  onChange={(e) => setCommForm({ ...commForm, type: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Notice">Notice</option>
                  <option value="Prayer Request">Prayer Request</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Priority</label>
                <select
                  value={commForm.priority}
                  onChange={(e) => setCommForm({ ...commForm, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={commForm.message}
                  onChange={(e) => setCommForm({ ...commForm, message: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCommModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Post Communication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className={modalBackdrop}>
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] ">
              <h2 className="text-lg font-semibold text-[var(--color-text)] ">Create Event</h2>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={submitEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Description</label>
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  min="15"
                  value={eventForm.duration}
                  onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                />
              </div>

              {/* Collection Option */}
              <div className="border-t border-[var(--color-border)]  pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="hasCollection"
                    checked={eventForm.hasCollection}
                    onChange={(e) => setEventForm({ ...eventForm, hasCollection: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-[var(--color-border)] rounded focus:ring-green-500"
                  />
                  <label htmlFor="hasCollection" className="text-sm font-medium text-[var(--color-text)] ">
                    Enable Collection/Budget Tracking
                  </label>
                </div>

                {eventForm.hasCollection && (
                  <div className="space-y-4 pl-6 border-l-2 border-green-200">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Collection Title</label>
                      <input
                        type="text"
                        value={eventForm.collectionTitle}
                        onChange={(e) => setEventForm({ ...eventForm, collectionTitle: e.target.value })}
                        placeholder="e.g., Building Fund, Special Offering"
                        className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Collection Description</label>
                      <textarea
                        rows={2}
                        value={eventForm.collectionDescription}
                        onChange={(e) => setEventForm({ ...eventForm, collectionDescription: e.target.value })}
                        placeholder="Describe the purpose of this collection"
                        className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Target Amount</label>
                      <input
                        type="number"
                        value={eventForm.collectionTargetAmount}
                        onChange={(e) => setEventForm({ ...eventForm, collectionTargetAmount: e.target.value })}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Visibility</label>
                      <select
                        value={eventForm.collectionVisibility}
                        onChange={(e) => setEventForm({ ...eventForm, collectionVisibility: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-green-500  "
                      >
                        <option value="department">Department Members Only</option>
                        <option value="church">Entire Church</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className={modalBackdrop}>
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] ">
              <h2 className="text-lg font-semibold text-[var(--color-text)] ">Create Task</h2>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={submitTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-orange-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-orange-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-orange-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-orange-500  "
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Assignee</label>
                <input
                  type="text"
                  value={taskForm.assignee}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                  placeholder="Enter assignee name"
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-orange-500  "
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Information Modal */}
      {showEditModal && (
        <div className={modalBackdrop}>
          <div className="bg-[var(--color-surface)]  rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] ">
              <h2 className="text-lg font-semibold text-[var(--color-text)] ">Edit Department Information</h2>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartmentInfo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500  "
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]  transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;
