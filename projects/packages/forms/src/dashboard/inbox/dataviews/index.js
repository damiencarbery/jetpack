/**
 * External dependencies
 */

import {
	ExternalLink,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { DataViews } from '@wordpress/dataviews/wp';
import { dateI18n } from '@wordpress/date';
import { useCallback, useMemo, useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import { useSearchParams } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { getPath } from '../../inbox/util';
import { STORE_NAME } from '../../state';
import InboxResponse from '../response';
import {
	viewAction,
	markAsSpamAction,
	markAsNotSpamAction,
	checkForSpamAction,
	moveToTrashAction,
	deleteAction,
} from './actions';
import { useView } from './views';

const EMPTY_ARRAY = [];
const defaultLayouts = {
	table: { showMedia: false },
	// list: { showMedia: false },
};
const isItemClickable = () => true;

/**
 * Hook to get the status filter to apply from the URL.
 * This is the only way to filter the data by `status` as intentionally
 * we don't want to have a `status` filter in the UI.
 * @return {string} The status filter to apply.
 */
function useStatusFilter() {
	const [ searchParams ] = useSearchParams();
	const urlStatus = searchParams.get( 'status' );
	// Only allow specific status values.
	const statusFilter = [ 'inbox', 'spam', 'trash' ].includes( urlStatus ) ? urlStatus : 'inbox';
	return statusFilter === 'inbox' ? 'draft,publish' : statusFilter;
}

/**
 * The DataViews implementation.
 */
export default function InboxView() {
	const [ view, setView ] = useView();
	const [ selection, setSelection ] = useState( EMPTY_ARRAY );
	const [ sidePanelItem, setSidePanelItem ] = useState( null );
	// const [ selection, setSelection ] = useState( postId?.split( ',' ) ?? [] );
	const onChangeSelection = useCallback( items => {
		setSelection( items );
		// TODO: check about having selection in the URL..
	}, [] );
	const statusFilter = useStatusFilter();
	// TODO: rename below. It's the dates/sources options from REST..
	const filters = useSelect( select => select( STORE_NAME ).getFilters(), [] );
	const queryArgs = useMemo( () => {
		const _filters = view.filters?.reduce( ( accumulator, { field, value } ) => {
			if ( ! value ) {
				return accumulator;
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
			status: statusFilter,
		};
	}, [ view, statusFilter ] );
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
						<ExternalLink href={ item.entry_permalink }>
							{ decodeEntities( item.entry_title ) || getPath( item ) }
						</ExternalLink>
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
		<HStack spacing={ 8 } alignment="top" justify="flex-start">
			<div className="jp-forms__inbox__dataviews">
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
					isItemClickable={ isItemClickable }
					onClickItem={ setSidePanelItem }
					defaultLayouts={ defaultLayouts }
				/>
			</div>
			{ /* // TODO: use container queries to hide this on mobile and only keep the action */ }
			{ sidePanelItem && (
				<div className="jp-forms__inbox__dataviews-response">
					<InboxResponse response={ sidePanelItem } isLoading={ isLoadingData }></InboxResponse>
				</div>
			) }
		</HStack>
	);
}
