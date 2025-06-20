// src/components/BusinessCard/BusinessCard.jsx
import React, { useState, memo, useCallback } from 'react';
import axiosInstance from '../../api/axiosInstance';
import styles from './BusinessCard.module.css';

// Default placeholder image path (place in public folder or import if in src/assets)
const DEFAULT_PLACEHOLDER_IMAGE = '/images/placeholder_buisness.png'; // Adjust path as necessary

/**
 * Renders stars based on the rating.
 * @param {number} rating - The numerical rating (e.g., 4.5).
 * @param {number} maxStars - The maximum number of stars (default 5).
 * @returns {JSX.Element[]} An array of star elements.
 */
const renderStars = (rating, maxStars = 5) => {
  const stars = [];
  const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5

  for (let i = 1; i <= maxStars; i++) {
    if (i <= roundedRating) {
      // Full star
      stars.push(<span key={`star-full-${i}`} className={`${styles.star} ${styles.starFull}`}>★</span>);
    } else if (i - 0.5 === roundedRating) {
      // Half star (optional, depends on your icon set and preference)
      // For simplicity, you might just round to full stars or use a different icon for half.
      // This example treats > .0 and < .9 as half if you want more granular half-star icons.
      // For now, we'll use the full star character and let CSS differentiate if needed.
      stars.push(<span key={`star-half-${i}`} className={`${styles.star} ${styles.starHalf}`}>★</span>); // Needs specific CSS for half appearance
    } else {
      // Empty star
      stars.push(<span key={`star-empty-${i}`} className={`${styles.star} ${styles.starEmpty}`}>☆</span>);
    }
  }
  return stars;
};

/**
 * BusinessCard component displays a summary of a business.
 * @param {object} props - The component's props.
 * @param {object} props.business - The business data object.
 * Expected business object properties:
 * - business_id (number/string): Unique identifier.
 * - name (string): Name of the business.
 * - category (string, optional): Category of the business.
 * - location (string, optional): Location/address of the business.
 * - photos (string/JSON array, optional): URLs of business photos.
 * - average_rating (number, optional): The average rating of the business.
 * - review_count (number, optional): The number of reviews.
 * - description (string, optional): A short description.
 */
const BusinessCard = memo(function BusinessCard({ business, onUpdate, onDelete, onOpenModal, userRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    business_name: business.business_name || business.name || '',
    category: business.category || '',
    description: business.description || '',
    location: business.location || '',
    phone: business.phone || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Destructure with default values to prevent errors if properties are missing
  const {
    business_id,
    business_name,
    name = business_name || "שם עסק לא ידוע", // Unknown Business Name
    category = "",
    location = "",
    description = "",
    phone = "",
    photos, // Can be a JSON string or already an array
    average_rating,
    review_count,
  } = business;

  // --- Image Handling ---
  let imageUrl = DEFAULT_PLACEHOLDER_IMAGE;
  if (photos) {
    try {
      // Attempt to parse photos if it's a JSON string
      const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
      if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0 && parsedPhotos[0]) {
        imageUrl = parsedPhotos[0]; // Use the first photo
      }
    } catch (e) {
      console.warn(`Could not parse photos for business ID ${business_id}:`, photos, e);
      // imageUrl remains DEFAULT_PLACEHOLDER_IMAGE
    }
  }

  // --- Fallback for Image onError ---
  const handleImageError = (event) => {
    // Prevent infinite loop if placeholder also fails
    if (event.target.src !== DEFAULT_PLACEHOLDER_IMAGE) {
      event.target.onerror = null; // Remove the error handler
      event.target.src = DEFAULT_PLACEHOLDER_IMAGE; // Set to default placeholder
    }
  };

  // --- CRUD Functions ---
  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleUpdate = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axiosInstance.put(`/businesses/${business_id}`, editData);
      onUpdate(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update business:', error);
      alert('נכשל בעדכון העסק');
    } finally {
      setIsLoading(false);
    }
  }, [business_id, editData, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק עסק זה?')) {
      setIsLoading(true);

      try {
        await axiosInstance.delete(`/businesses/${business_id}`);
        onDelete(business_id);
      } catch (error) {
        console.error('Failed to delete business:', error);
        alert('נכשל במחיקת העסק');
      } finally {
        setIsLoading(false);
      }
    }
  }, [business_id, onDelete]);

  // Handle modal opening - only trigger when clicked on card elements
  const handleImageClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenModal) {
      onOpenModal(business);
    }
  }, [onOpenModal, business]);

  const handleNameClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenModal) {
      onOpenModal(business);
    }
  }, [onOpenModal, business]);

  const canModify = true; //userRole === 'admin' || userRole === 'business_owner';

  // Temporarily show buttons for all users for testing - change back to canModify later
  const showButtons = canModify || !userRole;

  if (isEditing && canModify) {
    return (
      <div className={styles.businessCard}>
        <form onSubmit={handleUpdate} className={styles.editForm}>
          <input
            type="text"
            name="business_name"
            value={editData.business_name}
            onChange={handleEditChange}
            placeholder="שם העסק"
            className={styles.editInput}
            required
          />
          <input
            type="text"
            name="category"
            value={editData.category}
            onChange={handleEditChange}
            placeholder="קטגוריה"
            className={styles.editInput}
            required
          />
          <textarea
            name="description"
            value={editData.description}
            onChange={handleEditChange}
            placeholder="תיאור"
            className={styles.editTextarea}
            rows="3"
          />
          <input
            type="text"
            name="location"
            value={editData.location}
            onChange={handleEditChange}
            placeholder="מיקום"
            className={styles.editInput}
          />
          <input
            type="tel"
            name="phone"
            value={editData.phone}
            onChange={handleEditChange}
            placeholder="טלפון"
            className={styles.editInput}
          />
          <div className={styles.editActions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isLoading}
            >
              {isLoading ? '💾 שומר...' : '💾 שמור'}
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
            >
              ❌ ביטול
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.businessCard}>
      <div className={styles.imageContainer} onClick={handleImageClick}>
        <img
          src={imageUrl}
          alt={`תמונה של ${name}`} // Image of [Business Name] - important for accessibility
          className={styles.image}
          onError={handleImageError} // Handle broken image links
          loading="lazy" // Improve performance by lazy-loading images
        />
      </div>
      <div className={styles.content}>
        <h3
          className={styles.businessName}
          onClick={handleNameClick}
        >
          {name || business_name}
        </h3>
        {category && <p className={styles.category}>{category}</p>}
        {description && <p className={styles.description}>{description}</p>}
        {location && <p className={styles.location}>📍 {location}</p>}
        {phone && <p className={styles.phone}>📞 {phone}</p>}

        {/* Display rating only if available */}
        {typeof average_rating === 'number' && (
          <div className={styles.ratingContainer} aria-label={`Rating: ${average_rating.toFixed(1)} out of 5 stars`}>
            <span className={styles.ratingValue} aria-hidden="true">⭐ {average_rating.toFixed(1)}</span>
            <span className={styles.stars} aria-hidden="true">{renderStars(average_rating)}</span>
            {typeof review_count === 'number' && review_count > 0 && (
              <span className={styles.reviewCount} aria-label={`${review_count} reviews`}>({review_count})</span>
            )}
          </div>
        )}
      </div>

      {showButtons && (
        <div className={styles.actions}>
          <button
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            ✏️ ערוך
          </button>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? '🗑️ מוחק...' : '🗑️ מחק'}
          </button>
        </div>
      )}

    </div>
  );
});

export default BusinessCard;