import apiFetch from '@wordpress/api-fetch';
import { store as coreStore } from '@wordpress/core-data';
/**
 * Internal dependencies
 */
import { fetchResponses as fetchResponsesFromApi } from '../data/responses';
import {
	ASYNC_ROUTINE_DISPATCH,
	RESPONSES_FETCH,
	RESPONSES_FETCH_FAIL,
	RESPONSES_FETCH_RECEIVE,
	RESPONSES_LOADING_SET,
	RESPONSES_REMOVE,
	RESPONSES_SELECTION_SET,
	RESPONSES_TAB_TOTALS_ADD,
	RECEIVE_FILTERS,
} from './action-types';

/**
 * One dispatch async to rule them all.
 *
 * @param {Function} apply - The function to apply the dispatch to.
 * @param {Array}    args  - Arguments to be passed onto the function.
 * @return {object} Action object.
 */
export const dispatchAsync = ( apply, args = [] ) => ( {
	type: ASYNC_ROUTINE_DISPATCH,
	apply,
	args,
} );

/**
 * Handles the entire flow for fetching responses asynchronously.
 *
 * @param {object}  query          - Query.
 * @param {object}  options        - Options.
 * @param {boolean} options.append - Whether to append the responses to the existing set or replace it. Defaults to false.
 * @yield {object} Action object.
 * @return {object} Action object.
 */
export function* fetchResponses( query, options = {} ) {
	yield { type: RESPONSES_FETCH, append: options.append, query };

	try {
		const data = yield dispatchAsync( fetchResponsesFromApi, [ query ] );

		return {
			type: RESPONSES_FETCH_RECEIVE,
			responses: data.responses,
			total: data.totals[ query.status || 'inbox' ],
			tabTotals: data.totals,
			filters: data.filters_available,
			append: options.append,
		};
	} catch ( error ) {
		return {
			type: RESPONSES_FETCH_FAIL,
			error,
		};
	}
}

/**
 * Removes the given responses from the current set.
 *
 * @param {Array}  responseIds - Response IDs to remove.
 * @param {string} status      - Current of the responses to be removed.
 * @return {object} Action object.
 */
export const removeResponses = ( responseIds, status ) => ( {
	type: RESPONSES_REMOVE,
	responseIds,
	status,
} );

/**
 * Updates the currently selected responses.
 *
 * @param {Array} selectedResponses - Selected responses.
 * @return {object}                   Action object.
 */
export const selectResponses = selectedResponses => ( {
	type: RESPONSES_SELECTION_SET,
	selectedResponses,
} );

/**
 * Set the application loading state.
 *
 * @param {boolean} loading - The loading state.
 * @return {object} Action object.
 */
export const setLoading = loading => ( {
	type: RESPONSES_LOADING_SET,
	loading,
} );

/**
 * Add to current tab total numbers.
 *
 * @param {object} tabTotals - Totals to add.
 * @return {object} Action object,
 */
export const addTabTotals = tabTotals => ( {
	type: RESPONSES_TAB_TOTALS_ADD,
	tabTotals,
} );

/**
 * Receive the available filters for the responses.
 *
 * @param {object} filters - Filters for the responses.
 * @return {object} Action object.
 */
export function receiveFilters( filters ) {
	return {
		type: RECEIVE_FILTERS,
		filters,
	};
}

/**
 * Performs a bulk action on responses.
 *
 * @param {number[]} ids    - The list of responses' ids to be updated.
 * @param {string}   action - The action to be executed.
 * @return {Promise} Request promise.
 */
export const doBulkAction =
	( ids, action ) =>
	// TODO: check if I should handle multiple dispatched actions here to avoid multiple same requests.
	// This is handled okay in bulk actions from DataViews, but not for single item actions..
	async ( { registry } ) => {
		// TODO: try/catch and possible notifications.
		// Check notifications in each action too..
		await apiFetch( {
			path: `wp/v2/feedback/bulk_actions`,
			method: 'POST',
			data: {
				action,
				post_ids: ids,
			},
		} );
		// TODO: Can I batch this?? Can I fine tune this?
		[ 'getEntityRecords', 'getEntityRecordsTotalItems', 'getEntityRecordsTotalPages' ].forEach(
			selector => registry.dispatch( coreStore ).invalidateResolutionForStoreSelector( selector )
		);
	};
