import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TablePagination,
  Chip,
} from '@mui/material';

interface Column {
  field: string;
  header: string;
  sortable?: boolean;
}

interface TableWidgetProps {
  widget: {
    id: string;
    title: string;
    description?: string;
    config: {
      columns?: Column[];
    };
    styling?: {
      backgroundColor?: string;
      borderColor?: string;
      textColor?: string;
      borderRadius?: number;
      shadow?: boolean;
    };
  };
  data?: {
    columns: Column[];
    data: any[];
  };
  error?: string;
  loading?: boolean;
  lastUpdated?: Date;
}

const TableWidget: React.FC<TableWidgetProps> = ({ widget, data, error, loading, lastUpdated }) => {
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortData = (data: any[]) => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, orderBy);
      const bValue = getNestedValue(b, orderBy);

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const formatCellValue = (value: any, column: Column): React.ReactNode => {
    if (value === null || value === undefined) {
      return '-';
    }

    // Handle different data types
    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value ? 'Yes' : 'No'}
          color={value ? 'success' : 'default'}
          size="small"
        />
      );
    }

    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    // Handle status-like fields
    if (typeof value === 'string' && column.field.toLowerCase().includes('status')) {
      const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
          case 'completed':
          case 'approved':
          case 'active':
            return 'success';
          case 'pending':
          case 'in-progress':
          case 'draft':
            return 'warning';
          case 'rejected':
          case 'failed':
          case 'inactive':
            return 'error';
          default:
            return 'default';
        }
      };

      return (
        <Chip
          label={value}
          color={getStatusColor(value) as any}
          size="small"
          variant="outlined"
        />
      );
    }

    // Handle objects (like user names)
    if (typeof value === 'object' && value !== null) {
      if (value.firstName && value.lastName) {
        return `${value.firstName} ${value.lastName}`;
      }
      if (value.name) {
        return value.name;
      }
      return JSON.stringify(value);
    }

    return String(value);
  };

  const sortedData = data ? sortData(data.data) : [];
  const paginatedData = sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...widget.styling,
        ...(widget.styling?.shadow && {
          boxShadow: 3,
        }),
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            {widget.title}
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
              <CircularProgress size={32} />
            </Box>
          ) : error ? (
            <Alert severity="error">
              {error}
            </Alert>
          ) : data && data.data.length > 0 ? (
            <>
              <TableContainer component={Paper} sx={{ flex: 1, mb: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {data.columns.map((column) => (
                        <TableCell key={column.field}>
                          {column.sortable !== false ? (
                            <TableSortLabel
                              active={orderBy === column.field}
                              direction={orderBy === column.field ? order : 'asc'}
                              onClick={() => handleRequestSort(column.field)}
                            >
                              {column.header}
                            </TableSortLabel>
                          ) : (
                            column.header
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.map((row, index) => (
                      <TableRow key={index} hover>
                        {data.columns.map((column) => (
                          <TableCell key={column.field}>
                            {formatCellValue(getNestedValue(row, column.field), column)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {data.data.length > rowsPerPage && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={data.data.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  size="small"
                />
              )}
            </>
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
              <Typography variant="body2" color="text.secondary">
                No data available
              </Typography>
            </Box>
          )}
        </Box>

        {widget.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {widget.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TableWidget;