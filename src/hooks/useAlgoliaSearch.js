import { useState, useCallback, useRef } from 'react';
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY
);
const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'products';

/**
 * useAlgoliaSearch — instant search hook for the AmazonsChoice page.
 * Returns { suggestions, searchAlgolia, clearSuggestions, isSearching }
 */
const useAlgoliaSearch = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);

  // Get instant suggestions as user types (debounced 200ms)
  const searchAlgolia = useCallback((query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { hits } = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query,
            hitsPerPage: 8,
            attributesToRetrieve: ['name', 'category', 'brand'],
            attributesToHighlight: [],
            filters: 'isAmazonsChoice:true',
          },
        });

        // Deduplicate suggestion names
        const seen = new Set();
        const names = hits
          .map((h) => h.name)
          .filter((n) => {
            if (seen.has(n)) return false;
            seen.add(n);
            return true;
          });

        setSuggestions(names);
      } catch (err) {
        console.error('Algolia search error:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  }, []);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, searchAlgolia, clearSuggestions, isSearching };
};

export default useAlgoliaSearch;
