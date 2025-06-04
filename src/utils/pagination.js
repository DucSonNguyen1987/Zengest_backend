/**
 * Utilitaire de pagination Zengest
 * Généré automatiquement par le script de correction
 */

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

const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page doit être >= 1'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit doit être entre 1 et 100'
    });
  }
  
  req.pagination = { page, limit };
  next();
};

module.exports = {
  createPagination,
  validatePagination
};
