/**
 * External dependencies
 */
import { Button } from '@wordpress/components';
import { useEvent } from '@wordpress/compose';
import { useEntityRecords } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { DataViews } from '@wordpress/dataviews';
import { dateI18n } from '@wordpress/date';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, _x } from '@wordpress/i18n';
import { useSearchParams } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { getPath } from '../../inbox/util';
import { STORE_NAME } from '../../state';
import {
	viewAction,
	markAsSpamAction,
	markAsNotSpamAction,
	checkForSpamAction,
	moveToTrashAction,
	deleteAction,
} from './actions';

const EMPTY_ARRAY = [];
// TODO: this might be removed based on the decisions about allowing to view all responses
// together. Alternatively it can be inlined.
const getDefaultStatusFilter = ( status = 'inbox' ) => {
	return {
		field: 'status',
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
	fields: [ 'date', 'status', 'source' ],
	titleField: 'from',
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
		// That would require REST API changes that default to fetching `publish` responses.
		const newStatusValue =
			newView.filters.find( filter => filter.field === 'status' )?.value || 'inbox';
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
				filter => filter.field === 'status'
			)?.value;
			if ( newStatus === previousViewStatus ) {
				return previousView;
			}
			// TODO: I have to check when I reset the filters and if we should be allowed to do that..
			// For now let's assume we always have a status filter.
			const newFilters = previousView.filters.reduce( ( accumulator, filter ) => {
				if ( filter.field === 'status' ) {
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
	const [ selection, setSelection ] = useState( EMPTY_ARRAY );
	// const [ selection, setSelection ] = useState( postId?.split( ',' ) ?? [] );
	const onChangeSelection = useCallback( items => {
		setSelection( items );
		// TODO: check about having selection in the URL..
	}, [] );
	const filters = useSelect( select => select( STORE_NAME ).getFilters(), [] );
	const queryArgs = useMemo( () => {
		// TODO: if we eventually want to show all responses together, we need handle status
		// when there is no status filter because of the default `status` value in REST API.
		//_filters.status = [ 'draft', 'publish', 'spam', 'trash' ];
		const _filters = view.filters?.reduce( ( accumulator, { field, value } ) => {
			if ( ! value ) {
				return accumulator;
			}
			if ( field === 'status' ) {
				accumulator.status = value === 'inbox' ? 'draft,publish' : value;
			}
			if ( field === 'source' ) {
				accumulator.parent = value;
			}
			if ( field === 'date' ) {
				const [ year, month ] = value.split( '/' ).map( Number );
				accumulator.after = new Date( Date.UTC( year, month - 1, 1 ) ).toISOString();
				accumulator.before = new Date( Date.UTC( year, month, 0 ) ).toISOString();
			}
			return accumulator;
		}, {} );
		return {
			per_page: view.perPage,
			page: view.page,
			search: view.search,
			..._filters,
		};
	}, [ view ] );
	const {
		records,
		isResolving: isLoadingData,
		totalItems,
		totalPages,
	} = useEntityRecords( 'postType', 'feedback', queryArgs );
	const data = useMemo(
		() =>
			records?.map( record => ( {
				...record,
				fields: Object.entries( record.fields || {} ).reduce( ( accumulator, [ key, value ] ) => {
					accumulator[ key ] = decodeEntities( value );
					return accumulator;
				}, {} ),
			} ) ),
		[ records ]
	);
	const paginationInfo = useMemo(
		() => ( { totalItems, totalPages } ),
		[ totalItems, totalPages ]
	);
	const fields = useMemo(
		() => [
			{
				id: 'from',
				label: __( 'From', 'jetpack-forms' ),
				getValue: ( { item } ) => {
					return (
						decodeEntities( item.author_name ) || item.author_email || item.author_url || item.ip
					);
				},
			},
			{
				id: 'date',
				label: __( 'Date', 'jetpack-forms' ),
				render: ( { item } ) => dateI18n( 'M j, Y', item.date ),
				elements: ( filters?.date || [] ).map( _filter => {
					const date = new Date();
					date.setDate( 1 );
					date.setMonth( _filter.month - 1 );
					return {
						label: `${ dateI18n( 'F', date ) } ${ _filter.year }`,
						value: `${ _filter.year }/${ _filter.month }`,
					};
				} ),
				filterBy: { operators: [ 'is' ] },
				enableSorting: false,
			},
			{
				id: 'source',
				label: __( 'Source', 'jetpack-forms' ),
				render: ( { item } ) => {
					return (
						<Button href={ item.entry_permalink } variant="link">
							{ decodeEntities( item.entry_title ) || getPath( item ) }
						</Button>
					);
				},
				elements: ( filters?.source || [] ).map( source => ( {
					value: source.id,
					label: source.title,
				} ) ),
				filterBy: { operators: [ 'is' ] },
				enableSorting: false,
			},
			{ id: 'ip', label: __( 'IP Address', 'jetpack-forms' ), enableSorting: false },
			{
				id: 'status',
				label: __( 'Status', 'jetpack-forms' ),
				render: ( { item: { status } } ) => {
					return statuses.find(
						_status => _status.value === status || _status.recordValue?.includes( status )
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
		[ filters ]
	);
	const actions = useMemo( () => {
		return [
			viewAction,
			markAsSpamAction,
			markAsNotSpamAction,
			checkForSpamAction,
			moveToTrashAction,
			deleteAction,
		];
	}, [] );
	return (
		<DataViews
			paginationInfo={ paginationInfo }
			fields={ fields }
			actions={ actions }
			data={ data || EMPTY_ARRAY }
			isLoading={ isLoadingData }
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
