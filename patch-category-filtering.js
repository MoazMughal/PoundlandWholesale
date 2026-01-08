// Patch to fix category filtering for new URL-safe format

import fs from 'fs';

const patchContent = `
    if (category && category !== 'all') {
      // Decode URL-encoded category first
      const decodedCategory = decodeURIComponent(category);
      
      console.log('🔍 Category filtering - Original:', category, 'Decoded:', decodedCategory);
      
      // Handle both URL-friendly values and display names
      const categoryQuery = {
        $or: [
          { category: decodedCategory }, // Exact match with decoded category
          { category: category }, // Exact match with original category
        ]
      };
      
      // Convert URL-friendly format to proper display format
      if (decodedCategory.includes('-')) {
        // Convert dashes to spaces: "diy-and-tools" -> "diy and tools"
        const withSpaces = decodedCategory.replace(/-/g, ' ');
        categoryQuery.$or.push({ category: withSpaces });
        categoryQuery.$or.push({ category: { $regex: \`^\${withSpaces.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$\`, $options: 'i' } });
        
        // Convert "and" back to "&" for database lookup: "diy and tools" -> "diy & tools"
        const withAmpersand = withSpaces.replace(/\\band\\b/g, '&');
        if (withAmpersand !== withSpaces) {
          categoryQuery.$or.push({ category: withAmpersand });
          categoryQuery.$or.push({ category: { $regex: \`^\${withAmpersand.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$\`, $options: 'i' } });
        }
        
        // Convert to proper case: "diy & tools" -> "DIY & Tools"
        const properCase = withAmpersand.split(' ').map(word => {
          if (word.toLowerCase() === 'diy') return 'DIY';
          if (word === '&') return '&';
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
        
        categoryQuery.$or.push({ category: properCase });
        categoryQuery.$or.push({ category: { $regex: \`^\${properCase.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$\`, $options: 'i' } });
        
        console.log('🔍 Generated proper case:', properCase);
      }
      
      // Handle legacy URLs with & symbol (for backward compatibility)
      if (decodedCategory.includes('&')) {
        const withSpaces = decodedCategory.replace(/&/g, ' & ');
        const withoutSpaces = decodedCategory.replace(/\\s*&\\s*/g, '&');
        categoryQuery.$or.push({ category: withSpaces });
        categoryQuery.$or.push({ category: withoutSpaces });
        categoryQuery.$or.push({ category: { $regex: \`^\${withSpaces.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$\`, $options: 'i' } });
        categoryQuery.$or.push({ category: { $regex: \`^\${withoutSpaces.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$\`, $options: 'i' } });
      }
      
      console.log('🔍 Category filtering for:', decodedCategory, 'Query options:', categoryQuery.$or.length);
      
      query = { ...query, ...categoryQuery };
    }`;

console.log('This patch would update the category filtering logic to handle both old (&) and new (and) formats.');
console.log('The key change is converting "and" back to "&" when searching the database.');
console.log('\\nPatch content preview:');
console.log(patchContent.substring(0, 500) + '...');