const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = options.maxLimit || MAX_LIMIT;
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const requestedLimit = parsePositiveInt(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta({ page, limit, total }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1
  };
}

async function paginateQuery(query, countQuery, reqQuery = {}, options = {}) {
  const pagination = getPagination(reqQuery, options);
  const [data, total] = await Promise.all([
    query.skip(pagination.skip).limit(pagination.limit),
    countQuery
  ]);

  return {
    data,
    pagination: buildPaginationMeta({ ...pagination, total })
  };
}

module.exports = {
  getPagination,
  buildPaginationMeta,
  paginateQuery
};
