/**
 * External dependencies
 */
import {
	TabPanel,
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalHStack as HStack,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	createInterpolateElement,
	useCallback,
	useEffect,
	useState,
	useRef,
	useMemo,
} from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';
import clsx from 'clsx';
import { includes, isEqual, keys, map, pick } from 'lodash';
import { useNavigate, useSearchParams } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { config } from '../';
import Layout from '../components/layout';
import { STORE_NAME } from '../state';
import InboxView from './dataviews';
import ExportModal from './export-modal';
import { useFeedbackQuery } from './use-feedback-query';
/**
 * Style dependencies
 */
import './style.scss';

const TABS = [
	{
		name: 'inbox',
		title: __( 'Inbox', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
	{
		name: 'spam',
		title: __( 'Spam', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
	{
		name: 'trash',
		title: _x( 'Trash', 'noun', 'jetpack-forms' ),
		className: 'jp-forms__inbox-tab-item',
	},
];

const Inbox = () => {
	const [ searchParams, setSearchParams ] = useSearchParams();
	const urlStatus = searchParams.get( 'status' );
	const stickySentinel = useRef( undefined );
	const [ responseAnimationDirection, setResponseAnimationDirection ] = useState( 1 );
	const [ showExportModal, setShowExportModal ] = useState( false );
	const [ isSticky, setSticky ] = useState( false );
	const navigate = useNavigate();
	const [
		currentQuery,
		monthFilter,
		sourceFilter,
		loading,
		responses,
		selectedResponses,
		tabTotals,
		total,
	] = useSelect(
		select => [
			select( STORE_NAME ).getQuery(),
			select( STORE_NAME ).getMonthFilter(),
			select( STORE_NAME ).getSourceFilter(),
			select( STORE_NAME ).isFetchingResponses(),
			select( STORE_NAME ).getResponses(),
			select( STORE_NAME ).getSelectedResponseIds(),
			select( STORE_NAME ).getTabTotals(),
			select( STORE_NAME ).getTotalResponses(),
		],
		[]
	);

	const userCanExport = useSelect(
		select => select( coreStore ).canUser( 'update', 'settings' ),
		[]
	);

	const { currentResponseId, setCurrentResponseId: setActiveResponse, query } = useFeedbackQuery();

	// If a user has no responses yet, redirect them to the landing page.
	useEffect( () => {
		if ( config( 'hasFeedback' ) ) {
			return;
		}
		navigate( '/landing' );
	}, [ navigate ] );

	useEffect( () => {
		if (
			! currentResponseId ||
			loading ||
			! isEqual( pick( currentQuery, keys( query ) ), query ) ||
			includes( map( responses, 'id' ), currentResponseId )
		) {
			return;
		}

		// Redirect to the list view on mobile when the response ID is invalid
		setActiveResponse( 0 );
	}, [ currentQuery, currentResponseId, loading, responses, setActiveResponse, query ] );

	// const activeResponse = useMemo( () => {
	// 	if ( responses.length && ! includes( map( responses, 'id' ), currentResponseId ) ) {
	// 		return responses[ 0 ].id;
	// 	}

	// 	return currentResponseId;
	// }, [ currentResponseId, responses ] );

	useEffect( () => {
		const stickySentinelRef = stickySentinel.current;

		if ( ! stickySentinelRef ) {
			return;
		}

		const observer = new IntersectionObserver(
			( [ sentinel ] ) => {
				setSticky( ! sentinel.isIntersecting && ! loading );
			},
			{
				rootMargin: '-177px 0px 0px 0px',
				threshold: 0,
			}
		);

		observer.observe( stickySentinelRef );

		return () => {
			observer.unobserve( stickySentinelRef );
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ stickySentinel.current, loading ] );

	// const selectResponse = useCallback(
	// 	id => {
	// 		setActiveResponse( id );
	// 		setResponseAnimationDirection(
	// 			findIndex( responses, { id } ) - findIndex( responses, { id: activeResponse } )
	// 		);
	// 	},
	// 	[ activeResponse, responses, setActiveResponse ]
	// );

	const toggleExportModal = useCallback(
		() => setShowExportModal( ! showExportModal ),
		[ showExportModal, setShowExportModal ]
	);

	const classes = clsx( 'jp-forms__inbox', {
		'is-response-view': !! currentResponseId,
		'is-response-animation-reverted': responseAnimationDirection < 0,
	} );

	// TODO: this might be relevant if we decide to try to have a split view too..
	// <div className="jp-forms__inbox-content-column">
	// 	<InboxResponse isLoading={ loading } response={ find( responses, { id: activeResponse } ) } />
	// </div>;
	const title = <span className="title">{ __( 'Responses', 'jetpack-forms' ) }</span>;

	const subtitle = (
		<span className="subtitle">
			{ createInterpolateElement(
				__( 'Collect and manage responses from your audience. <a>Learn more</a>', 'jetpack-forms' ),
				{
					a: (
						<a
							href="https://jetpack.com/support/jetpack-blocks/contact-form/"
							rel="noreferrer noopener"
							target="_blank"
						/>
					),
				}
			) }
		</span>
	);

	const onTabSelect = useCallback(
		newStatusValue => {
			setSearchParams( previouSearchParams => {
				const _serachParams = new URLSearchParams( previouSearchParams );
				_serachParams.set( 'status', newStatusValue );
				return _serachParams;
			} );
		},
		[ setSearchParams ]
	);
	// TODO: check `Layout` component to refactor or remove.. For now I copied
	// the title and subtitle html..
	return (
		<Layout className={ classes }>
			<div className="jp-forms__layout-header">
				<HStack justify="space-between">
					<h2 className="jp-forms__layout-title">{ title }</h2>
					{ userCanExport && (
						<Button className="export-button" variant="primary" onClick={ toggleExportModal }>
							{ __( 'Export', 'jetpack-forms' ) }
						</Button>
					) }
				</HStack>
				<p className="jp-forms__header-subtext">{ subtitle }</p>
			</div>
			<TabPanel
				className="jp-forms__inbox-tabs"
				activeClass="active-tab"
				initialTabName={ [ 'inbox', 'spam', 'trash' ].includes( urlStatus ) ? urlStatus : 'inbox' }
				onSelect={ onTabSelect }
				tabs={ TABS }
			>
				{ () => <InboxView /> }
			</TabPanel>
			<ExportModal isVisible={ showExportModal } onClose={ toggleExportModal } />
		</Layout>
	);
};

export default Inbox;
