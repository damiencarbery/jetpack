/**
 * External dependencies
 */
import { Button } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	createInterpolateElement,
	useCallback,
	useEffect,
	useState,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import clsx from 'clsx';
import { includes, isEqual, keys, map, pick } from 'lodash';
import { useNavigate } from 'react-router-dom';
/**
 * Internal dependencies
 */
import { config } from '../';
import Layout from '../components/layout';
import { STORE_NAME } from '../state';
import { RESPONSES_FETCH_LIMIT } from './constants';
import InboxView from './dataviews';
import ExportModal from './export-modal';
import { useFeedbackQuery } from './use-feedback-query';
/**
 * Style dependencies
 */
import './style.scss';

const Inbox = () => {
	const stickySentinel = useRef( undefined );
	const [ responseAnimationDirection, setResponseAnimationDirection ] = useState( 1 );
	const [ showExportModal, setShowExportModal ] = useState( false );
	const [ isSticky, setSticky ] = useState( false );
	const navigate = useNavigate();
	const { fetchResponses, selectResponses } = useDispatch( STORE_NAME );
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

	const {
		currentPage,
		currentResponseId,
		setCurrentResponseId: setActiveResponse,
		query,
	} = useFeedbackQuery();

	useEffect( () => {
		if ( config( 'hasFeedback' ) ) {
			return;
		}

		navigate( '/landing' );
	}, [ navigate ] );

	useEffect( () => {
		fetchResponses( {
			limit: RESPONSES_FETCH_LIMIT,
			offset: ( currentPage - 1 ) * RESPONSES_FETCH_LIMIT,
			...query,
		} );
	}, [ currentPage, fetchResponses, query ] );

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

	return (
		<Layout title={ title } subtitle={ subtitle } className={ classes }>
			{ userCanExport && (
				<Button className="export-button" variant="primary" onClick={ toggleExportModal }>
					{ __( 'Export', 'jetpack-forms' ) }
				</Button>
			) }
			<InboxView />
			<ExportModal isVisible={ showExportModal } onClose={ toggleExportModal } />
		</Layout>
	);
};

export default Inbox;
