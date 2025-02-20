/**
 * External dependencies
 */
import { combineReducers } from '@wordpress/data';
/**
 * Internal dependencies
 */
import {
	RESPONSES_FETCH_RECEIVE,
	RESPONSES_SELECTION_SET,
	RECEIVE_FILTERS,
	SET_CURRENT_QUERY,
} from './action-types';

const filters = ( state = {}, action ) => {
	if ( action.type === RECEIVE_FILTERS ) {
		return action.filters;
	}
	return state;
};

const currentQuery = ( state = {}, action ) => {
	if ( action.type === SET_CURRENT_QUERY ) {
		return action.currentQuery;
	}
	return state;
};

const currentSelection = ( state = [], action ) => {
	if ( action.type === RESPONSES_FETCH_RECEIVE ) {
		return [];
	}

	if ( action.type === RESPONSES_SELECTION_SET ) {
		return action.selectedResponses;
	}

	return state;
};

export default combineReducers( {
	currentSelection,
	filters,
	currentQuery,
} );
