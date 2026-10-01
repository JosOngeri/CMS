import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../app/theme.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  ApiService? _apiService;
  List<dynamic> _photos = [];
  bool _isLoading = true;
  bool _isRefreshing = false;
  String? _errorMessage;

  String _searchTerm = '';
  String? _selectedCategory;
  String? _selectedLabel;
  bool _favoritesOnly = false;
  final Set<String> _favInFlight = {};

  @override
  void initState() {
    super.initState();
    _initApiService();
  }

  Future<void> _initApiService() async {
    _apiService = await ApiService.getInstance();
    _loadPhotos();
  }

  Future<void> _loadPhotos() async {
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
      final result = await _apiService!.getGalleryPhotos();
      if (result['success'] == true) {
        setState(() {
          _photos = result['photos'] ?? [];
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load gallery';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load gallery. Please check your connection.';
      });
    } finally {
      setState(() {
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  Future<void> _refreshPhotos() async {
    setState(() => _isRefreshing = true);
    await _loadPhotos();
  }

  bool _isFav(Map<String, dynamic> photo) => photo['is_favorited'] == true;

  List<String> _photoLabels(Map<String, dynamic> photo) {
    final labels = photo['my_labels'];
    return labels is List ? labels.map((l) => l.toString()).toList() : [];
  }

  Future<void> _toggleFavorite(Map<String, dynamic> photo) async {
    final photoId = photo['id']?.toString();
    if (photoId == null || _favInFlight.contains(photoId)) return;

    final previous = _isFav(photo);
    setState(() {
      _favInFlight.add(photoId);
      photo['is_favorited'] = !previous;
    });

    try {
      final result = await _apiService!.toggleGalleryFavorite(photoId);
      if (result['success'] == true) {
        setState(() => photo['is_favorited'] = result['favorited'] == true);
      } else {
        setState(() => photo['is_favorited'] = previous);
        _showErrorSnackBar(result['error'] ?? 'Failed to update favourite');
      }
    } catch (e) {
      setState(() => photo['is_favorited'] = previous);
      _showErrorSnackBar('Failed to update favourite');
    } finally {
      setState(() => _favInFlight.remove(photoId));
    }
  }

  Future<void> _addLabel(
      Map<String, dynamic> photo, String label, StateSetter setModalState) async {
    final trimmed = label.trim();
    final photoId = photo['id']?.toString();
    if (trimmed.isEmpty || photoId == null) return;
    if (_photoLabels(photo).contains(trimmed)) return;

    try {
      final result = await _apiService!.addGalleryLabel(photoId, trimmed);
      if (result['success'] == true) {
        setState(() {
          photo['my_labels'] = [..._photoLabels(photo), trimmed];
        });
        setModalState(() {});
      } else {
        _showErrorSnackBar(result['error'] ?? 'Failed to add label');
      }
    } catch (e) {
      _showErrorSnackBar('Failed to add label');
    }
  }

  Future<void> _removeLabel(
      Map<String, dynamic> photo, String label, StateSetter setModalState) async {
    final photoId = photo['id']?.toString();
    if (photoId == null) return;

    try {
      final result = await _apiService!.removeGalleryLabel(photoId, label);
      if (result['success'] == true) {
        setState(() {
          photo['my_labels'] =
              _photoLabels(photo).where((l) => l != label).toList();
        });
        setModalState(() {});
      } else {
        _showErrorSnackBar(result['error'] ?? 'Failed to remove label');
      }
    } catch (e) {
      _showErrorSnackBar('Failed to remove label');
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

  List<String> get _categories => _photos
      .map((p) => p['category']?.toString())
      .where((c) => c != null && c.isNotEmpty)
      .toSet()
      .cast<String>()
      .toList()
    ..sort();

  List<String> get _myLabels => _photos
      .expand((p) => _photoLabels(p))
      .toSet()
      .toList()
    ..sort();

  List<dynamic> get _filteredPhotos {
    return _photos.where((photo) {
      final term = _searchTerm.toLowerCase();
      final matchesSearch = term.isEmpty ||
          (photo['caption']?.toString().toLowerCase().contains(term) ?? false) ||
          (photo['description']?.toString().toLowerCase().contains(term) ??
              false) ||
          (photo['title']?.toString().toLowerCase().contains(term) ?? false);
      final matchesCategory =
          _selectedCategory == null || photo['category'] == _selectedCategory;
      final matchesFavorites = !_favoritesOnly || _isFav(photo);
      final matchesLabel = _selectedLabel == null ||
          _photoLabels(photo).contains(_selectedLabel);
      return matchesSearch && matchesCategory && matchesFavorites && matchesLabel;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshPhotos,
          ),
        ],
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _errorMessage != null
              ? _buildErrorState()
              : _photos.isEmpty
                  ? _buildEmptyState()
                  : _buildGalleryBody(),
    );
  }

  Widget _buildGalleryBody() {
    final filtered = _filteredPhotos;
    return RefreshIndicator(
      onRefresh: _refreshPhotos,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildFilterBar()),
          if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Text(
                  'No photos match your filters',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 0.85,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildPhotoCard(filtered[index]),
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      child: Column(
        children: [
          TextField(
            decoration: InputDecoration(
              hintText: 'Search photos...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _searchTerm = v),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                FilterChip(
                  avatar: Icon(
                    _favoritesOnly ? Icons.favorite : Icons.favorite_border,
                    size: 16,
                    color: _favoritesOnly
                        ? AppTheme.errorColor
                        : AppTheme.textSecondary,
                  ),
                  label: const Text('Favourites'),
                  selected: _favoritesOnly,
                  onSelected: (v) => setState(() => _favoritesOnly = v),
                ),
                const SizedBox(width: 8),
                if (_categories.isNotEmpty) ...[
                  _buildDropdownChip<String>(
                    hint: 'Category',
                    value: _selectedCategory,
                    items: _categories,
                    onChanged: (v) => setState(() => _selectedCategory = v),
                  ),
                  const SizedBox(width: 8),
                ],
                if (_myLabels.isNotEmpty)
                  _buildDropdownChip<String>(
                    hint: 'My labels',
                    value: _selectedLabel,
                    items: _myLabels,
                    onChanged: (v) => setState(() => _selectedLabel = v),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownChip<T>({
    required String hint,
    required T? value,
    required List<T> items,
    required ValueChanged<T?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: AppTheme.dividerColor),
        borderRadius: BorderRadius.circular(20),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          hint: Text(hint, style: const TextStyle(fontSize: 13)),
          isDense: true,
          items: [
            DropdownMenuItem<T>(
              value: null,
              child: Text('All', style: const TextStyle(fontSize: 13)),
            ),
            ...items.map((item) => DropdownMenuItem<T>(
                  value: item,
                  child: Text('$item', style: const TextStyle(fontSize: 13)),
                )),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildPhotoCard(Map<String, dynamic> photo) {
    final photoId = photo['id']?.toString() ?? '';
    final isFav = _isFav(photo);
    final labels = _photoLabels(photo);

    return Card(
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: () => _showPhotoDetail(photo),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildPhotoImage(photoId),
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                icon: Icon(
                  isFav ? Icons.favorite : Icons.favorite_border,
                  color: isFav ? AppTheme.errorColor : Colors.white,
                  size: 22,
                ),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.black38,
                  padding: const EdgeInsets.all(6),
                  minimumSize: const Size(36, 36),
                ),
                onPressed: _favInFlight.contains(photoId)
                    ? null
                    : () => _toggleFavorite(photo),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [Colors.black87, Colors.transparent],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      photo['caption'] ?? photo['title'] ?? 'Untitled',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                    if (labels.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Row(
                          children: [
                            const Icon(Icons.label,
                                size: 12, color: Colors.white70),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                labels.join(', '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    color: Colors.white70, fontSize: 10),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoImage(String photoId) {
    if (_apiService == null || photoId.isEmpty) {
      return Container(
        color: AppTheme.dividerColor,
        child: const Icon(Icons.broken_image, color: AppTheme.textTertiary),
      );
    }
    return Image.network(
      _apiService!.galleryImageUrl(photoId),
      fit: BoxFit.cover,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          color: AppTheme.dividerColor,
          child: const Center(
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        );
      },
      errorBuilder: (context, error, stack) => Container(
        color: AppTheme.dividerColor,
        child: const Icon(Icons.broken_image, color: AppTheme.textTertiary),
      ),
    );
  }

  void _showPhotoDetail(Map<String, dynamic> photo) {
    final labelController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (modalContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final labels = _photoLabels(photo);
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AspectRatio(
                      aspectRatio: 4 / 3,
                      child: _buildPhotoImage(photo['id']?.toString() ?? ''),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  photo['caption'] ??
                                      photo['title'] ??
                                      'Untitled',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: Icon(
                                  _isFav(photo)
                                      ? Icons.favorite
                                      : Icons.favorite_border,
                                  color: _isFav(photo)
                                      ? AppTheme.errorColor
                                      : AppTheme.textSecondary,
                                ),
                                onPressed: () {
                                  _toggleFavorite(photo);
                                  setModalState(() {});
                                },
                              ),
                            ],
                          ),
                          if (photo['description'] != null &&
                              photo['description'].toString().isNotEmpty)
                            Text(
                              photo['description'],
                              style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          if (photo['category'] != null) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.folder,
                                    size: 14, color: AppTheme.textSecondary),
                                const SizedBox(width: 6),
                                Text(
                                  photo['category'],
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 16),
                          const Text(
                            'My labels',
                            style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          if (labels.isNotEmpty)
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: labels
                                  .map(
                                    (label) => InputChip(
                                      label: Text(label,
                                          style: const TextStyle(fontSize: 12)),
                                      avatar: const Icon(Icons.label, size: 14),
                                      onDeleted: () => _removeLabel(
                                          photo, label, setModalState),
                                      visualDensity: VisualDensity.compact,
                                    ),
                                  )
                                  .toList(),
                            ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: labelController,
                                  decoration: InputDecoration(
                                    hintText: 'Add a private label...',
                                    isDense: true,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  onSubmitted: (v) {
                                    _addLabel(photo, v, setModalState);
                                    labelController.clear();
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.add_circle),
                                color: AppTheme.primaryColor,
                                onPressed: () {
                                  _addLabel(
                                      photo, labelController.text, setModalState);
                                  labelController.clear();
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Labels are private — only you can see them.',
                            style: TextStyle(
                                fontSize: 11, color: AppTheme.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Loading gallery...'),
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
            const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPhotos,
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
            const Icon(Icons.photo_library_outlined,
                size: 64, color: AppTheme.textTertiary),
            const SizedBox(height: 16),
            Text(
              'No photos yet',
              style: TextStyle(fontSize: 18, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 8),
            Text(
              'Published church photos will appear here',
              style: TextStyle(fontSize: 14, color: AppTheme.textTertiary),
            ),
          ],
        ),
      ),
    );
  }
}
