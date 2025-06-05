// src/utils/pagination.js
const createPagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = Math.min(parseInt(limit) || 10, 100);
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    total: totalItems,
    limit: itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    skip: (currentPage - 1) * itemsPerPage
  };
};

module.exports = { createPagination };