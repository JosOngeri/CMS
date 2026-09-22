import 'package:flutter/material.dart';
import '../services/api_service.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  ApiService? _apiService;
  List<dynamic>? _events;
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _errorMessage;
  final Set<String> _rsvpInFlight = {};

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    if (_apiService == null) {
      setState(() {
        _errorMessage = 'Service not initialized';
        _isLoading = false;
      });
      return;
    }

    if (!_isRefreshing) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final result = await _apiService!.getEvents();
      if (result['success'] == true) {
        setState(() {
          _events = result['events'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load events';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load events. Please check your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  Future<void> _refreshEvents() async {
    setState(() => _isRefreshing = true);
    await _loadEvents();
  }

  Future<void> _rsvp(Map<String, dynamic> event, String status) async {
    final eventId = event['id']?.toString();
    if (eventId == null || _rsvpInFlight.contains(eventId)) return;

    setState(() => _rsvpInFlight.add(eventId));

    try {
      final result = await _apiService!.rsvpEvent(eventId, status);
      if (result['success'] == true) {
        setState(() {
          event['my_rsvp_status'] = status == 'cancelled' ? null : status;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(status == 'attending'
                ? 'You are registered for this event'
                : 'RSVP updated'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        _showErrorSnackBar(result['error'] ?? 'Failed to record RSVP');
      }
    } catch (e) {
      _showErrorSnackBar('Failed to record RSVP');
    } finally {
      setState(() => _rsvpInFlight.remove(eventId));
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshEvents,
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _errorMessage != null
              ? _buildErrorState()
              : _events == null || _events!.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _refreshEvents,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _events!.length,
                        itemBuilder: (context, index) =>
                            _buildEventCard(_events![index]),
                      ),
                    ),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final eventId = event['id']?.toString() ?? '';
    final myStatus = event['my_rsvp_status'] as String?;
    final isAttending = myStatus == 'attending' || myStatus == 'maybe';
    final isBusy = _rsvpInFlight.contains(eventId);
    final attendeeCount = event['attendee_count'];

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    event['title'] ?? 'Event',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (isAttending)
                  const Chip(
                    label: Text('Going', style: TextStyle(fontSize: 11)),
                    backgroundColor: Color(0xFFDCFCE7),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                const SizedBox(width: 6),
                Text(
                  _formatEventDate(event['event_date'], event['event_time']),
                  style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                ),
              ],
            ),
            if (event['location'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      event['location'],
                      style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                    ),
                  ),
                ],
              ),
            ],
            if (event['department_name'] != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.groups, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    event['department_name'],
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                ],
              ),
            ],
            if (event['description'] != null &&
                event['description'].toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                event['description'],
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Colors.grey[600]),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (attendeeCount != null)
                  Text(
                    '$attendeeCount attending',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  )
                else
                  const SizedBox.shrink(),
                isBusy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : ElevatedButton.icon(
                        onPressed: () => _rsvp(
                          event,
                          isAttending ? 'not_attending' : 'attending',
                        ),
                        icon: Icon(
                          isAttending ? Icons.close : Icons.check,
                          size: 18,
                        ),
                        label: Text(isAttending ? 'Cancel RSVP' : 'RSVP'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isAttending
                              ? Colors.grey[300]
                              : Theme.of(context).colorScheme.primary,
                          foregroundColor:
                              isAttending ? Colors.black87 : Colors.white,
                        ),
                      ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatEventDate(dynamic date, dynamic time) {
    if (date == null) return '';
    try {
      final parsed = DateTime.parse(date.toString());
      final dateStr = '${parsed.day}/${parsed.month}/${parsed.year}';
      return time != null ? '$dateStr at $time' : dateStr;
    } catch (e) {
      return date.toString();
    }
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading events...'),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadEvents,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No upcoming events',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Check back later for church events',
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }
}
