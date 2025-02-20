const EMPTY_OBJECT = {};

export const getFilters = state => state.filters || EMPTY_OBJECT;
export const getCurrentQuery = state => state.currentQuery || EMPTY_OBJECT;

// TODO: remove obsolete stuff..

export const getSelectedResponseIds = state => state.currentSelection;
