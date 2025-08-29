import React from 'react';
import { Box } from '@mui/material';
import GlobalSearch from './GlobalSearch';

interface QuickSearchProps {
  onResultSelect?: (result: any) => void;
}

const QuickSearch: React.FC<QuickSearchProps> = ({ onResultSelect }) => {
  return (
    <Box sx={{ maxWidth: 400 }}>
      <GlobalSearch
        variant="header"
        placeholder="Quick search..."
        onResultSelect={onResultSelect}
      />
    </Box>
  );
};

export default QuickSearch;