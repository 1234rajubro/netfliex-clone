import React, { useState, useEffect } from 'react';
import './App.css';

// Component Imports
import Auth from './components/Auth/Auth';
import ProfileSelect from './components/ProfileSelect/ProfileSelect';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import MovieRow from './components/MovieRow/MovieRow';
import DetailModal from './components/DetailModal/DetailModal';
import WatchPlayer from './components/WatchPlayer/WatchPlayer';
import MovieCard from './components/MovieCard/MovieCard';

export default function App() {
  // Auth States
  const [token, setToken] = useState(() => localStorage.getItem('netfilex_auth_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('netfilex_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Application Database States
  const [movies, setMovies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  // Navigation & Interactive States
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [watchingMovie, setWatchingMovie] = useState(null);
  const [watchlist, setWatchlist] = useState([]);

  // Load profiles and movies from MongoDB when user is logged in
  useEffect(() => {
    if (token) {
      fetchProfiles();
      fetchMovies();
    } else {
      setProfiles([]);
      setMovies([]);
      setCurrentProfile(null);
      setWatchlist([]);
    }
  }, [token]);

  // Load currentProfile from localStorage and sync with loaded profiles
  useEffect(() => {
    if (profiles.length > 0) {
      const savedProfile = localStorage.getItem('netfilex_active_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          // Find matching profile in fresh list to get latest watchlist
          const matched = profiles.find(p => p._id === parsed._id || p.id === parsed.id);
          if (matched) {
            setCurrentProfile(matched);
            setWatchlist(matched.watchlist || []);
          } else {
            setCurrentProfile(null);
            setWatchlist([]);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [profiles]);

  // API Call: Fetch all profiles
  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Fetch profiles error: ', err);
    }
  };

  // API Call: Fetch all seeded movies
  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/movies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMovies(data);
      }
    } catch (err) {
      console.error('Fetch movies error: ', err);
    }
  };

  // API Call: Create new profile inside MongoDB
  const handleCreateProfile = async (name, color) => {
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          color,
          avatar: name.toLowerCase() === 'kids' ? '/avatar-kids.svg' : '/avatar-guest.svg'
        })
      });
      if (response.ok) {
        // Refresh profiles database
        fetchProfiles();
      }
    } catch (err) {
      console.error('Create profile error: ', err);
    }
  };

  // API Call: Toggle watchlist item inside MongoDB
  const toggleWatchlist = async (movieId) => {
    if (!currentProfile || !token) return;

    try {
      const response = await fetch(`/api/profiles/${currentProfile._id}/watchlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ movieId })
      });

      if (response.ok) {
        const updatedWatchlist = await response.json();
        setWatchlist(updatedWatchlist);
        
        // Sync watchlist changes inside currentProfile state & local storage
        const updatedProfile = { ...currentProfile, watchlist: updatedWatchlist };
        setCurrentProfile(updatedProfile);
        localStorage.setItem('netfilex_active_profile', JSON.stringify(updatedProfile));
        
        // Sync inside profiles list
        setProfiles(prev => prev.map(p => p._id === currentProfile._id ? updatedProfile : p));
      }
    } catch (err) {
      console.error('Toggle watchlist error: ', err);
    }
  };

  const handleAuthSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('netfilex_auth_token', newToken);
    localStorage.setItem('netfilex_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentProfile(null);
    setProfiles([]);
    setMovies([]);
    setWatchlist([]);
    localStorage.removeItem('netfilex_auth_token');
    localStorage.removeItem('netfilex_user');
    localStorage.removeItem('netfilex_active_profile');
    setActiveTab('home');
    setSearchQuery('');
  };

  const handleSelectProfile = (profile) => {
    setCurrentProfile(profile);
    setWatchlist(profile.watchlist || []);
    localStorage.setItem('netfilex_active_profile', JSON.stringify(profile));
  };

  // Movie filtering based on profile rating clearance
  const getActiveCatalog = () => {
    if (currentProfile && currentProfile.name.toLowerCase() === 'kids') {
      return movies.filter(movie => movie.ageRating !== 'TV-MA' && movie.ageRating !== 'R');
    }
    return movies;
  };

  const getCategorizedMovies = (category) => {
    return getActiveCatalog().filter(movie => movie.category === category);
  };

  const getTrendingMovies = () => getActiveCatalog().filter(movie => movie.isTrending);
  const getPopularMovies = () => getActiveCatalog().filter(movie => movie.isPopular);
  const getTopRatedMovies = () => getActiveCatalog().filter(movie => movie.isTopRated);

  const getWatchlistMovies = () => {
    return getActiveCatalog().filter(movie => watchlist.includes(movie.id));
  };

  const getFilteredByTab = () => {
    const catalog = getActiveCatalog();
    if (activeTab === 'tv') {
      return catalog.filter(movie => movie.type === 'tv');
    }
    if (activeTab === 'movies') {
      return catalog.filter(movie => movie.type === 'movie');
    }
    return catalog;
  };

  // Search filter
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return getActiveCatalog().filter(movie => 
      movie.title.toLowerCase().includes(query) ||
      movie.description.toLowerCase().includes(query) ||
      movie.genres.some(g => g.toLowerCase().includes(query)) ||
      movie.cast.some(c => c.toLowerCase().includes(query)) ||
      movie.category.toLowerCase().includes(query)
    );
  };

  // Choose appropriate Hero movie based on section
  const getHeroMovie = () => {
    const catalog = getActiveCatalog();
    if (activeTab === 'tv') {
      const tvShows = catalog.filter(m => m.type === 'tv');
      return tvShows[0] || catalog[0];
    }
    if (activeTab === 'movies') {
      const movies = catalog.filter(m => m.type === 'movie');
      return movies[0] || catalog[0];
    }
    return catalog[0];
  };

  // --- RENDERING WORKFLOW ---

  // 1. If not logged in, show Sign In / Sign Up page
  if (!token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // 2. If no profile selected, render profile select portal
  if (!currentProfile) {
    return (
      <ProfileSelect 
        profiles={profiles} 
        onSelectProfile={handleSelectProfile} 
        onCreateProfile={handleCreateProfile}
      />
    );
  }

  // 3. If playing movie, render video player overlay
  if (watchingMovie) {
    return (
      <WatchPlayer 
        movie={watchingMovie} 
        onClose={() => setWatchingMovie(null)} 
      />
    );
  }

  const isSearching = searchQuery.trim() !== '';
  const searchResults = getSearchResults();
  const heroMovie = getHeroMovie();

  return (
    <div className="app-container">
      <Navbar 
        currentProfile={currentProfile}
        profiles={profiles}
        onSwitchProfile={handleSelectProfile}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {isSearching ? (
        /* Search Grid Results View */
        <div className="search-results-container animate-fade-in">
          <h2 className="search-title">
            Search results for: <span>"{searchQuery}"</span>
          </h2>
          {searchResults.length > 0 ? (
            <div className="search-results-grid">
              {searchResults.map(movie => (
                <MovieCard 
                  key={movie.id}
                  movie={movie}
                  isAddedToList={watchlist.includes(movie.id)}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3 className="empty-state-title">No results found</h3>
              <p>Your search for "{searchQuery}" did not return any titles.</p>
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Try searching for keywords like "Space", "Tokyo", "Woods", "Chef" or genres like "Sci-Fi", "Action", "Documentary".
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'mylist' ? (
        /* Watchlist list grid view */
        <div className="search-results-container animate-fade-in">
          <h2 className="search-title">My List</h2>
          {watchlist.length > 0 ? (
            <div className="search-results-grid">
              {getWatchlistMovies().map(movie => (
                <MovieCard 
                  key={movie.id}
                  movie={movie}
                  isAddedToList={true}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3 className="empty-state-title">Your list is empty</h3>
              <p>Add shows and movies to your list so you can easily find them later.</p>
            </div>
          )}
        </div>
      ) : (
        /* Normal Catalog rows browse view */
        <div className="main-content">
          {heroMovie && (
            <Hero 
              movie={heroMovie} 
              onPlay={setWatchingMovie}
              onOpenDetails={setSelectedMovie}
            />
          )}

          <div style={{ marginTop: '-4vw', position: 'relative', zIndex: 12 }}>
            {activeTab === 'home' && (
              <>
                <MovieRow 
                  title="Trending Now" 
                  movies={getTrendingMovies()} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
                
                {watchlist.length > 0 && (
                  <MovieRow 
                    title="My List" 
                    movies={getWatchlistMovies()} 
                    watchlist={watchlist}
                    onToggleList={toggleWatchlist}
                    onPlay={setWatchingMovie}
                    onOpenDetails={setSelectedMovie}
                  />
                )}

                <MovieRow 
                  title="Popular on Netflix" 
                  movies={getPopularMovies()} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />

                <MovieRow 
                  title="Sci-Fi Thrillers" 
                  movies={getCategorizedMovies('Sci-Fi')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />

                <MovieRow 
                  title="Action Blockbusters" 
                  movies={getCategorizedMovies('Action')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />

                <MovieRow 
                  title="Documentaries" 
                  movies={getCategorizedMovies('Documentary')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
              </>
            )}

            {activeTab === 'tv' && (
              <>
                <MovieRow 
                  title="Trending TV Series" 
                  movies={getTrendingMovies().filter(m => m.type === 'tv')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
                <MovieRow 
                  title="Action & Cyberpunk Shows" 
                  movies={getFilteredByTab().filter(m => m.category === 'Action' || m.genres.includes('Cyberpunk'))} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
                <MovieRow 
                  title="TV Documentaries & Culinary Arts" 
                  movies={getFilteredByTab().filter(m => m.category === 'Documentary')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
              </>
            )}

            {activeTab === 'movies' && (
              <>
                <MovieRow 
                  title="Blockbuster Movies" 
                  movies={getFilteredByTab().filter(m => m.isPopular)} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
                <MovieRow 
                  title="Acclaimed Sci-Fi & Adventure" 
                  movies={getFilteredByTab().filter(m => m.category === 'Sci-Fi')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
                <MovieRow 
                  title="Nature & Space Documentaries" 
                  movies={getFilteredByTab().filter(m => m.category === 'Documentary')} 
                  watchlist={watchlist}
                  onToggleList={toggleWatchlist}
                  onPlay={setWatchingMovie}
                  onOpenDetails={setSelectedMovie}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer Section */}
      <footer className="footer-container">
        <ul className="footer-links">
          <li className="footer-link">Audio Description</li>
          <li className="footer-link">Help Center</li>
          <li className="footer-link">Gift Cards</li>
          <li className="footer-link">Media Center</li>
          <li className="footer-link">Investor Relations</li>
          <li className="footer-link">Jobs</li>
          <li className="footer-link">Terms of Use</li>
          <li className="footer-link">Privacy Statement</li>
          <li className="footer-link">Legal Notices</li>
        </ul>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} Netflix, Inc. All rights reserved. (Created for {user?.name})
        </div>
      </footer>

      {/* Title Details Overlay Modal */}
      {selectedMovie && (
        <DetailModal 
          movie={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
          onPlay={setWatchingMovie}
          watchlist={watchlist}
          onToggleList={toggleWatchlist}
          onSelectMovie={setSelectedMovie}
          movies={getActiveCatalog()}
        />
      )}
    </div>
  );
}
