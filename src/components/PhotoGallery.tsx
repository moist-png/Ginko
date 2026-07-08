import React, { useState } from 'react';
import { Photo } from '../types';
import { Plus, X, Edit2, Camera } from 'lucide-react';

interface PhotoGalleryProps {
  photos: Photo[];
  readOnly?: boolean;
  onUpdate: (photos: Photo[]) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, readOnly = false, onUpdate }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  const categories = [
    { value: 'overview', label: 'Overview' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'crown', label: 'Crown' },
    { value: 'roots', label: 'Roots' },
    { value: 'damage', label: 'Damage' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto: Photo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url: e.target?.result as string,
          caption: '',
          category: 'overview',
          timestamp: Date.now()
        };
        onUpdate([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const deletePhoto = (photoId: string) => {
    if (readOnly) return;
    onUpdate(photos.filter(photo => photo.id !== photoId));
  };

  const updatePhoto = (updatedPhoto: Photo) => {
    if (readOnly) return;
    onUpdate(photos.map(photo => photo.id === updatedPhoto.id ? updatedPhoto : photo));
    setEditingPhoto(null);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      overview: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
      trunk: 'bg-brown-100 text-brown-800',
      crown: 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]',
      roots: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
      damage: 'bg-[var(--surface-overlay)] text-[var(--danger)]',
      other: 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Photo Gallery</h2>
        {!readOnly && (
          <label className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors cursor-pointer">
            <Plus size={20} />
            Add Photos
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No photos yet</h3>
          <p className="text-[var(--text-muted)] mb-4">Upload photos to document your tree assessment</p>
          {!readOnly && (
            <label className="inline-flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors cursor-pointer">
              <Plus size={20} />
              Upload Photos
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="bg-[var(--surface-raised)] rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => setEditingPhoto(photo)}
                        className="p-1 bg-[var(--surface-raised)] rounded-full shadow-md hover:bg-[var(--forest)] transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deletePhoto(photo.id)}
                        className="p-1 bg-[var(--surface-raised)] rounded-full shadow-md hover:bg-[var(--forest)] transition-colors text-[var(--danger)]"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(photo.category)}`}>
                    {categories.find(c => c.value === photo.category)?.label}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(photo.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)]">{photo.caption || 'No caption'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-raised)] rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Photo Preview</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                className="w-full h-auto max-h-96 object-contain"
              />
              <div className="mt-4">
                <p className="text-sm text-[var(--text-primary)]">{selectedPhoto.caption || 'No caption'}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {categories.find(c => c.value === selectedPhoto.category)?.label} • {new Date(selectedPhoto.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Photo Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-raised)] rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Photo</h3>
              <button
                onClick={() => setEditingPhoto(null)}
                className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Caption
                </label>
                <textarea
                  value={editingPhoto.caption}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Add a caption..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Category
                </label>
                <select
                  value={editingPhoto.category}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingPhoto(null)}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updatePhoto(editingPhoto)}
                  className="flex-1 px-4 py-2 bg-[var(--canopy)] text-[var(--cream)] rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};