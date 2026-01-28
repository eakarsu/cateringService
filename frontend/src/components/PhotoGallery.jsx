import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Trash2, Edit, Check } from 'lucide-react';

export default function PhotoGallery({ photos, eventId, userId, onUpload, onDelete, onUpdate, readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editingCaption, setEditingCaption] = useState(null);
  const [captionText, setCaptionText] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
      }
      formData.append('eventId', eventId);
      formData.append('uploadedBy', userId);

      await onUpload(formData);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditCaption = (photo) => {
    setEditingCaption(photo.id);
    setCaptionText(photo.caption || '');
  };

  const handleSaveCaption = async (photoId) => {
    try {
      await onUpdate(photoId, { caption: captionText });
      setEditingCaption(null);
    } catch (error) {
      console.error('Failed to update caption:', error);
    }
  };

  const handleDelete = async (photoId) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await onDelete(photoId);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  return (
    <div>
      {/* Upload Button */}
      {!readOnly && (
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Photos
              </>
            )}
          </button>
        </div>
      )}

      {/* Photo Grid */}
      {photos?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Event photo'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
          {!readOnly && (
            <p className="mt-1 text-sm text-gray-500">Upload photos from your event</p>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X size={32} />
            </button>

            {/* Image */}
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Event photo'}
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />

            {/* Caption & Actions */}
            <div className="mt-4 flex items-start justify-between">
              <div className="flex-1">
                {editingCaption === selectedPhoto.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input bg-white text-black flex-1"
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      placeholder="Add a caption..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveCaption(selectedPhoto.id)}
                      className="btn btn-primary"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditingCaption(null)}
                      className="btn btn-secondary"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="text-white">
                    {selectedPhoto.caption ? (
                      <p className="text-lg">{selectedPhoto.caption}</p>
                    ) : (
                      <p className="text-gray-400 italic">No caption</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      Uploaded by {selectedPhoto.uploader?.name || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>

              {!readOnly && (
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditCaption(selectedPhoto)}
                    className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-white"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPhoto.id)}
                    className="p-2 bg-red-500 bg-opacity-80 rounded-lg hover:bg-opacity-100 text-white"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
              <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4 -translate-y-1/2 pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
                    setSelectedPhoto(photos[prevIndex]);
                  }}
                  className="pointer-events-auto p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 text-white"
                >
                  &#8592;
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                    const nextIndex = (currentIndex + 1) % photos.length;
                    setSelectedPhoto(photos[nextIndex]);
                  }}
                  className="pointer-events-auto p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 text-white"
                >
                  &#8594;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
