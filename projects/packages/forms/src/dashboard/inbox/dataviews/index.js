/**
 * External dependencies
 */
import { Button } from '@wordpress/components';
import { useEvent } from '@wordpress/compose';
import { useEntityRecords, store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { DataViews } from '@wordpress/dataviews';
import { dateI18n } from '@wordpress/date';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';
import { useSearchParams } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { STORE_NAME } from '../../state';
import { viewAction, markAsSpamAction, markAsNotSpamAction } from './actions';

// TODO: this might be removed based on the decisions about allowing to view all responses
// together. Alternatively it can be inlined.
const getDefaultStatusFilter = ( status = 'inbox' ) => {
	return {
		field: 'post_status',
		operator: 'is',
		value: [ 'inbox', 'spam', 'trash' ].includes( status ) ? status : 'inbox',
	};
};
const defaultView = {
	type: 'table',
	search: '',
	filters: [],
	page: 1,
	perPage: 10,
	// sort: {
	// 	field: 'title',
	// 	direction: 'asc',
	// },
	fields: [ 'date', 'post_status', 'source' ],
	titleField: 'name',
};
const defaultLayouts = {
	table: { showMedia: false },
	// list: { showMedia: false },
};
const statuses = [
	{
		value: 'inbox',
		label: __( 'Inbox', 'jetpack-forms' ),
		recordValue: [ 'draft', 'publish' ],
	},
	{
		value: 'spam',
		label: __( 'Spam', 'jetpack-forms' ),
	},
	{
		value: 'trash',
		label: _x( 'Trash', 'noun', 'jetpack-forms' ),
	},
];
// Helper object to map filters to query args.
const filtersMap = {
	date: 'month',
	source: 'parent_id',
	post_status: 'status',
};
/**
 * This hook provides a [ state, setState ] tuple based on the URL parameters
 * and handles the syncing between the URL and the state.
 *
 * Currently we do that for the `status` and `search` URL params.
 *
 * @return {Array} The [ state, setState ] tuple.
 */
function useView() {
	const [ searchParams, setSearchParams ] = useSearchParams();
	const urlStatus = searchParams.get( 'status' );
	const urlSearch = searchParams.get( 'search' );
	const [ view, setView ] = useState( () => {
		return {
			...defaultView,
			search: urlSearch ?? '',
			filters: [ getDefaultStatusFilter( urlStatus ) ],
			...defaultLayouts[ defaultView.type ],
		};
	} );
	// When view changes, update the URL params if needed.
	const setViewWithUrlUpdate = useEvent( newView => {
		setView( newView );
		// TODO: check if we want to allow an empty `status` and show all responses.
		// That would require REST API changes that default to fetching `inbox` responses.
		// Also related to whether we keep the current endpoint..
		const newStatusValue =
			newView.filters.find( filter => filter.field === 'post_status' )?.value || 'inbox';
		const statusHasChanged = newStatusValue !== urlStatus;
		const searchHasChanged = newView.search !== urlSearch;
		if ( statusHasChanged || searchHasChanged ) {
			setSearchParams( previouSearchParams => {
				// TODO: check if I need a new object here..
				const _serachParams = new URLSearchParams( previouSearchParams );
				if ( statusHasChanged ) {
					_serachParams.set( 'status', newStatusValue );
				}
				if ( searchHasChanged ) {
					if ( newView.search ) {
						_serachParams.set( 'search', newView.search );
					} else {
						_serachParams.delete( 'search' );
					}
				}
				return _serachParams;
			} );
		}
	} );
	// When status URL param changes, update the view's status filter
	// without affecting any other config.
	const onUrlStatusChange = useEvent( () => {
		setView( previousView => {
			const newStatus = urlStatus ?? 'inbox';
			const previousViewStatus = previousView.filters.find(
				filter => filter.field === 'post_status'
			)?.value;
			if ( newStatus === previousViewStatus ) {
				return previousView;
			}
			// TODO: I have to check when I reset the filters and if we should be allowed to do that..
			// For now let's assume we always have a status filter.
			const newFilters = previousView.filters.reduce( ( accumulator, filter ) => {
				if ( filter.field === 'post_status' ) {
					accumulator.push( {
						...filter,
						value: newStatus,
					} );
				} else {
					accumulator.push( filter );
				}
				return accumulator;
			}, [] );
			return {
				...previousView,
				filters: newFilters,
			};
		} );
	} );
	useEffect( () => {
		onUrlStatusChange();
	}, [ onUrlStatusChange, urlStatus ] );
	// When search URL param changes, update the view's search filter
	// without affecting any other config.
	const onUrlSearchChange = useEvent( () => {
		setView( previousView => {
			const newValue = urlSearch ?? '';
			if ( newValue === previousView.search ) {
				return previousView;
			}
			return {
				...previousView,
				search: newValue,
			};
		} );
	} );
	useEffect( () => {
		onUrlSearchChange();
	}, [ onUrlSearchChange, urlSearch ] );
	return [ view, setViewWithUrlUpdate ];
}

/**
 * The DataViews implementation.
 */
export default function InboxView() {
	const [ view, setView ] = useView();
	// const [ searchParams, setSearchParams ] = useSearchParams();
	// const urlSelection = searchParams.get( 'r' );
	const [ selection, setSelection ] = useState( [] );
	// const [ selection, setSelection ] = useState( postId?.split( ',' ) ?? [] );
	const onChangeSelection = useCallback( items => {
		setSelection( items );
		// TODO: check about having selection in the URL..
	}, [] );
	const { fetchResponses, selectResponses } = useDispatch( STORE_NAME );
	const {
		currentQuery,
		monthFilter,
		sourceFilter,
		isLoading,
		data,
		selectedResponses,
		tabTotals,
		totalItems,
	} = useSelect( select => {
		const {
			getQuery,
			getMonthFilter,
			isFetchingResponses,
			getResponses,
			getSourceFilter,
			getSelectedResponseIds,
			getTabTotals,
			getTotalResponses,
		} = select( STORE_NAME );
		return {
			currentQuery: getQuery(),
			monthFilter: getMonthFilter(),
			sourceFilter: getSourceFilter(),
			isLoading: isFetchingResponses(),
			data: getResponses(),
			selectedResponses: getSelectedResponseIds(),
			tabTotals: getTabTotals(),
			totalItems: getTotalResponses(),
		};
	}, [] );
	const queryArgs = useMemo( () => {
		const filters = view.filters?.reduce( ( accumulator, { field, value } ) => {
			if ( filtersMap[ field ] ) {
				accumulator[ filtersMap[ field ] ] = value;
			}
			return accumulator;
		}, {} );
		// REST endpoint has no pagination it seems??
		return {
			limit: view.perPage,
			offset: ( view.page - 1 ) * view.perPage,
			search: view.search,
			...filters,
		};
	}, [ view ] );
	// const {
	// 	records,
	// 	isResolving: isLoadingData,
	// 	totalItems: totalRecords,
	// 	totalPages,
	// } = useEntityRecords( 'postType', 'feedback', {
	// 	// ...queryArgs,
	// 	status: 'trash',
	// 	page: view.page,
	// 	per_page: view.perPage,
	// } );

	// This need to go.. (part of store updates).
	useEffect( () => {
		fetchResponses( queryArgs );
	}, [ queryArgs, fetchResponses ] );
	const paginationInfo = useMemo(
		() => ( {
			totalItems,
			totalPages: Math.ceil( totalItems / view.perPage ),
		} ),
		[ totalItems, view.perPage ]
	);
	const fields = useMemo(
		() => [
			{ id: 'name', label: __( 'From', 'jetpack-forms' ) },
			{
				id: 'date',
				label: __( 'Date', 'jetpack-forms' ),
				render: ( { item } ) => dateI18n( 'M j, Y', item.date ),
				elements: monthFilter.map( _filter => {
					const date = new Date();
					date.setDate( 1 );
					date.setMonth( _filter.month - 1 );
					return {
						label: `${ dateI18n( 'F', date ) } ${ _filter.year }`,
						value: `${ _filter.year }${ String( _filter.month ).padStart( 2, '0' ) }`,
					};
				} ),
				filterBy: {
					operators: [ 'is' ],
				},
				enableSorting: false,
			},
			{
				id: 'source',
				label: __( 'Source', 'jetpack-forms' ),
				render: ( { item } ) => {
					return (
						<Button href={ item.entry_permalink } variant="link">
							{ item.source }
						</Button>
					);
				},
				elements: sourceFilter.map( source => ( { value: source.id, label: source.title } ) ),
				filterBy: {
					operators: [ 'is' ],
				},
				enableSorting: false,
			},
			{ id: 'ip', label: __( 'IP Address', 'jetpack-forms' ), enableSorting: false },
			{
				id: 'post_status',
				label: __( 'Status', 'jetpack-forms' ),
				render: ( { item: { post_status } } ) => {
					return statuses.find(
						status => status.value === post_status || status.recordValue?.includes( post_status )
					)?.label;
				},
				elements: statuses,
				filterBy: {
					operators: [ 'is' ],
					isPrimary: true,
				},
				enableSorting: false,
			},
		],
		[ monthFilter, sourceFilter ]
	);
	const actions = useMemo( () => {
		return [ viewAction, markAsSpamAction, markAsNotSpamAction ];
	}, [] );
	return (
		<DataViews
			paginationInfo={ paginationInfo }
			fields={ fields }
			actions={ actions }
			data={ data || [] }
			isLoading={ isLoading }
			view={ view }
			onChangeView={ setView }
			selection={ selection }
			onChangeSelection={ onChangeSelection }
			// isItemClickable={ item => item.status !== 'trash' }
			// onClickItem={ ( { id } ) => {
			// 	TODO: update URL or open modal or open split view??
			// } }
			defaultLayouts={ defaultLayouts }
		/>
	);
}
