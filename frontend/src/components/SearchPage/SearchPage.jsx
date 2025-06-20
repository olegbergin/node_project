// src/components/SearchPage/SearchPage.jsx

// --- Imports ---
import React, { useState, useEffect, useCallback } from 'react';
import BusinessCard from '../BusinessCard/BusinessCard.jsx';
import BusinessModal from '../BusinessModal/BusinessModal.jsx';
import styles from './SearchPage.module.css';
import axiosInstance from '../../api/axiosInstance.js';

// Debounce utility function with cleanup
function debounce(func, delay) {
  let timeoutId;
  const debouncedFunction = function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
  
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFunction;
}

/**
 * SearchPage component to display and filter businesses.
 */
function SearchPage({ user }) { // Assuming user is passed as a prop
  // --- State Hooks ---
  const [allBusinesses, setAllBusinesses] = useState([]); // Store all businesses
  const [filteredBusinesses, setFilteredBusinesses] = useState([]); // Filtered results
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [orderBy, setOrderBy] = useState('name'); // Default to name ordering
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [totalItems, setTotalItems] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [modalBusiness, setModalBusiness] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    business_name: '',
    category: '',
    description: '',
    location: '',
    phone: ''
  });

  // --- Fetch All Businesses Once ---
  const fetchAllBusinesses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all businesses at once (no pagination needed for small dataset)
      const response = await axiosInstance.get('/businesses');
      const businesses = response.data || [];
      
      setAllBusinesses(businesses);
      setFilteredBusinesses(businesses); // Initially show all
      setTotalItems(businesses.length);

    } catch (err) {
      console.error("Failed to fetch businesses:", err);
      let errorMessage = "Could not load businesses. Please try again.";
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
      }
      setError(errorMessage);
      setAllBusinesses([]);
      setFilteredBusinesses([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Client-side Filtering ---
  const filterBusinesses = useCallback(() => {
    let filtered = [...allBusinesses];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(business => 
        (business.name || business.business_name || '').toLowerCase().includes(searchLower) ||
        (business.description || '').toLowerCase().includes(searchLower) ||
        (business.category || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(business => business.category === selectedCategory);
    }

    // Apply ordering
    filtered.sort((a, b) => {
      switch (orderBy) {
        case 'category':
          const catA = (a.category || '').localeCompare(b.category || '');
          return catA !== 0 ? catA : (a.name || a.business_name || '').localeCompare(b.name || b.business_name || '');
        case 'rating':
          const ratingA = a.average_rating || 0;
          const ratingB = b.average_rating || 0;
          return ratingB - ratingA; // Descending
        case 'newest':
          return (b.business_id || 0) - (a.business_id || 0); // Descending by ID
        default: // 'name'
          return (a.name || a.business_name || '').localeCompare(b.name || b.business_name || '');
      }
    });

    setFilteredBusinesses(filtered);
    setTotalItems(filtered.length);
    setCurrentPage(1); // Reset to first page when filtering
  }, [allBusinesses, searchTerm, selectedCategory, orderBy]);

  // --- Instant Search (no debounce needed for client-side) ---
  const debouncedFilter = useCallback(
    debounce(() => {
      filterBusinesses();
    }, 150), // Very short debounce just to avoid excessive filtering while typing
    [filterBusinesses]
  );


  // --- Effects ---
  // Fetch all data when component mounts
  useEffect(() => {
    fetchAllBusinesses();
    
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get('/businesses/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        // Extract categories from loaded businesses as fallback
        setCategories([]);
      }
    };
    fetchCategories();
  }, [fetchAllBusinesses]);

  // Apply filters when filter criteria change (instant for non-search filters)
  useEffect(() => {
    if (allBusinesses.length > 0) {
      filterBusinesses();
    }
  }, [selectedCategory, orderBy, filterBusinesses]);

  // Apply debounced search when search term changes
  useEffect(() => {
    if (allBusinesses.length > 0) {
      debouncedFilter();
    }
  }, [searchTerm, debouncedFilter]);


  // --- Event Handlers ---
  const handleSearchInputChange = useCallback((event) => {
    setSearchTerm(event.target.value);
    // Filtering will be triggered automatically by useEffect
  }, []);

  const handleCategoryChange = useCallback((event) => {
    setSelectedCategory(event.target.value);
    setCurrentPage(1); // Reset to page 1
  }, []);

  const handleOrderByChange = useCallback((event) => {
    setOrderBy(event.target.value);
    setCurrentPage(1); // Reset to page 1
  }, []);

  // This handler is now only for explicit form submission (e.g., pressing Enter)
  // It cancels any pending debounced call and filters immediately.
  const handleFormSubmit = useCallback((event) => {
    event.preventDefault();
    // Cancel pending debounced search and filter immediately
    if (debouncedFilter.cancel) {
      debouncedFilter.cancel();
    }
    filterBusinesses();
  }, [debouncedFilter, filterBusinesses]);

  // --- Business CRUD Functions ---
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axiosInstance.post('/businesses', newBusiness);
      // Add to all businesses and filtering will happen automatically
      setAllBusinesses(prev => [response.data, ...prev]);
      setNewBusiness({
        business_name: '',
        category: '',
        description: '',
        location: '',
        phone: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create business:', error);
      setError('Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBusiness = useCallback((updatedBusiness) => {
    setAllBusinesses(prev =>
      prev.map(business =>
        business.business_id === updatedBusiness.business_id
          ? updatedBusiness
          : business
      )
    );
    // Filtering will happen automatically via useEffect
  }, []);

  const handleDeleteBusiness = useCallback((businessId) => {
    setAllBusinesses(prev => prev.filter(business => business.business_id !== businessId));
    // Filtering will happen automatically via useEffect
  }, []);

  const handleNewBusinessChange = (e) => {
    const { name, value } = e.target;
    setNewBusiness(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenModal = useCallback((business) => {
    setModalBusiness(business);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalBusiness(null);
  }, []);

  const canCreateBusiness = true;//user?.role === 'admin' || user?.role === 'business_owner';


  // --- Render Functions (без изменений) ---
  const renderPagination = () => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (
      <div className={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>קודם</button>
        <span>עמוד {currentPage} מתוך {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>הבא</button>
      </div>
    );
  };

  // --- Main Render (без изменений в JSX) ---
  return (
    <div className={styles.searchPageContainer}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>גלה עסקים</h1>
        <form onSubmit={handleFormSubmit} className={styles.filterForm}>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              placeholder="חפש שם עסק, שירות..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              className={styles.searchInput}
              aria-label="Search businesses"
            />
          </div>
          <div className={styles.filterControls}>
            <select value={selectedCategory} onChange={handleCategoryChange} className={styles.filterSelect} aria-label="Select category">
              <option value="">כל הקטגוריות</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={orderBy} onChange={handleOrderByChange} className={styles.filterSelect} aria-label="Order by">
              <option value="name">סדר לפי שם</option>
              <option value="category">סדר לפי קטגוריה</option>
              <option value="newest">חדשים ראשון</option>
            </select>
          </div>
        </form>
      </header>

      {/* Temporarily show for all users for testing - change back to canCreateBusiness later */}
      {(canCreateBusiness || !user?.role) && (
        <div className={styles.createBusinessSection}>
          {!showCreateForm ? (
            <button
              className={styles.createButton}
              onClick={() => setShowCreateForm(true)}
            >
              ➕ הוסף עסק חדש
            </button>
          ) : (
            <form onSubmit={handleCreateBusiness} className={styles.createForm}>
              <h3>צור עסק חדש</h3>
              <input
                type="text"
                name="business_name"
                value={newBusiness.business_name}
                onChange={handleNewBusinessChange}
                placeholder="שם העסק"
                className={styles.createInput}
                required
              />
              <input
                type="text"
                name="category"
                value={newBusiness.category}
                onChange={handleNewBusinessChange}
                placeholder="קטגוריה"
                className={styles.createInput}
                required
              />
              <textarea
                name="description"
                value={newBusiness.description}
                onChange={handleNewBusinessChange}
                placeholder="תיאור"
                className={styles.createTextarea}
                rows="3"
              />
              <input
                type="text"
                name="location"
                value={newBusiness.location}
                onChange={handleNewBusinessChange}
                placeholder="מיקום"
                className={styles.createInput}
              />
              <input
                type="tel"
                name="phone"
                value={newBusiness.phone}
                onChange={handleNewBusinessChange}
                placeholder="טלפון"
                className={styles.createInput}
              />
              <div className={styles.createActions}>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isLoading}
                >
                  {isLoading ? '💾 יוצר...' : '💾 צור עסק'}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreateForm(false)}
                  disabled={isLoading}
                >
                  ❌ ביטול
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {isLoading && <div className={styles.loadingIndicator}>טוען עסקים...</div>}
      {!isLoading && error && (
        <div className={styles.errorMessage}>
          <p>אופס! משהו השתבש:</p>
          <p>{error}</p>
          <button onClick={() => fetchBusinesses(currentPage)} className={styles.retryButton}>נסה שוב</button>
        </div>
      )}
      {!isLoading && !error && filteredBusinesses.length === 0 && allBusinesses.length > 0 && (
        <p className={styles.noResultsMessage}>לא נמצאו עסקים התואמים את חיפושך.</p>
      )}
      {!isLoading && !error && allBusinesses.length === 0 && (
        <p className={styles.noResultsMessage}>אין עסקים זמינים.</p>
      )}

      {!isLoading && !error && filteredBusinesses.length > 0 && (
        <BusinessList 
          businesses={filteredBusinesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
          onUpdate={handleUpdateBusiness}
          onDelete={handleDeleteBusiness}
          onOpenModal={handleOpenModal}
          userRole={user?.role}
        />
      )}
      {!isLoading && !error && filteredBusinesses.length > 0 && renderPagination()}
      
      {/* Modal rendered at page level to prevent interaction issues */}
      <BusinessModal 
        business={modalBusiness}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

// Memoized business list to prevent unnecessary rerenders
const BusinessList = React.memo(({ businesses, onUpdate, onDelete, onOpenModal, userRole }) => {
  return (
    <main className={styles.businessesGrid}>
      {businesses.map(business => (
        <BusinessCard
          key={business.business_id}
          business={business}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onOpenModal={onOpenModal}
          userRole={userRole}
        />
      ))}
    </main>
  );
});

BusinessList.displayName = 'BusinessList';

export default SearchPage;